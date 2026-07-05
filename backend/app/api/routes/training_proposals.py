from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.time import ensure_utc, utcnow
from app.models.enums import FormStatus, TrainingProposalStatus
from app.models.form import Form
from app.models.form_event import FormEvent
from app.models.training_category import TrainingCategory
from app.models.training_name import TrainingName
from app.models.training_name_proposal import TrainingNameProposal
from app.models.user import User
from app.services.notification_emails import send_training_proposal_review_notification
from app.models.mandatory_training_record import MandatoryTrainingRecord
from app.models.notification_read_watermark import NotificationReadWatermark
from app.schemas.training_proposals import (
    NotificationCounts,
    NotificationItem,
    NotificationSummaryResponse,
    MarkNotificationsSeenResponse,
    MarkNotificationScopesRequest,
    TrainingProposalApproveRequest,
    TrainingProposalCreateRequest,
    TrainingProposalLinkRequest,
    TrainingProposalRejectRequest,
    TrainingProposalResponse,
)

router = APIRouter(prefix="/training-proposals", tags=["training-proposals"])
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


def _allowed_area_ids(user: User) -> set[int] | None:
    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return None
    return {int(a.id) for a in (getattr(user, "areas", None) or []) if getattr(a, "id", None) is not None}


def _can_reference_form(user: User, form: Form) -> bool:
    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return True
    if form.created_by_user_id == user.id:
        return True
    if role == "MANAGER":
        allowed = _allowed_area_ids(user)
        return bool(allowed) and form.area_id in allowed
    return False


def _to_response(x: TrainingNameProposal) -> TrainingProposalResponse:
    return TrainingProposalResponse(
        id=x.id,
        name=x.name,
        name_en=x.name_en,
        justification=x.justification,
        suggested_category_id=x.suggested_category_id,
        provider=x.provider,
        external_url=x.external_url,
        estimated_cost_per_person=(float(x.estimated_cost_per_person) if x.estimated_cost_per_person is not None else None),
        estimated_hours_per_person=(float(x.estimated_hours_per_person) if x.estimated_hours_per_person is not None else None),
        notes=x.notes,
        status=x.status,
        requester_user_id=x.requester_user_id,
        requester_role=x.requester_role,
        requester_full_name=(x.requester.full_name if getattr(x, "requester", None) else None),
        form_id=x.form_id,
        review_comment=x.review_comment,
        reviewed_by_user_id=x.reviewed_by_user_id,
        reviewed_by_full_name=(x.reviewer.full_name if getattr(x, "reviewer", None) else None),
        reviewed_at=x.reviewed_at,
        linked_training_name_id=x.linked_training_name_id,
        linked_training_name_pl=(x.linked_training.name_pl if getattr(x, "linked_training", None) else None),
        linked_training_name_en=(x.linked_training.name_en if getattr(x, "linked_training", None) else None),
        approved_training_name_id=x.approved_training_name_id,
        approved_training_name_pl=(x.approved_training.name_pl if getattr(x, "approved_training", None) else None),
        approved_training_name_en=(x.approved_training.name_en if getattr(x, "approved_training", None) else None),
        created_at=x.created_at,
    )


def _base_query():
    return select(TrainingNameProposal).options(
        selectinload(TrainingNameProposal.requester),
        selectinload(TrainingNameProposal.reviewer),
        selectinload(TrainingNameProposal.linked_training),
        selectinload(TrainingNameProposal.approved_training),
    )


@router.post("", response_model=TrainingProposalResponse, status_code=status.HTTP_201_CREATED)
def create_training_proposal(
    payload: TrainingProposalCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"EDITOR", "MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    if payload.suggested_category_id is not None and not db.get(TrainingCategory, payload.suggested_category_id):
        raise HTTPException(status_code=404, detail="Training category not found")

    if payload.form_id is not None:
        form = db.get(Form, payload.form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if not _can_reference_form(user, form):
            raise HTTPException(status_code=403, detail="Forbidden")

    proposal = TrainingNameProposal(
        name=payload.name.strip(),
        name_en=(payload.name_en.strip() if payload.name_en else None),
        justification=payload.justification.strip(),
        suggested_category_id=payload.suggested_category_id,
        provider=(payload.provider.strip() if payload.provider else None),
        external_url=(payload.external_url.strip() if payload.external_url else None),
        estimated_cost_per_person=(Decimal(str(payload.estimated_cost_per_person)) if payload.estimated_cost_per_person is not None else None),
        estimated_hours_per_person=(Decimal(str(payload.estimated_hours_per_person)) if payload.estimated_hours_per_person is not None else None),
        notes=(payload.notes.strip() if payload.notes else None),
        status=TrainingProposalStatus.SUBMITTED.value,
        requester_user_id=user.id,
        requester_role=role,
        form_id=payload.form_id,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    proposal = db.scalar(_base_query().where(TrainingNameProposal.id == proposal.id))
    return _to_response(proposal)


@router.get("/my", response_model=list[TrainingProposalResponse])
def my_training_proposals(
    status_value: TrainingProposalStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = _base_query().where(TrainingNameProposal.requester_user_id == user.id)
    if status_value is not None:
        stmt = stmt.where(TrainingNameProposal.status == status_value.value)
    stmt = stmt.order_by(TrainingNameProposal.created_at.desc(), TrainingNameProposal.id.desc())
    items = db.scalars(stmt).all()
    return [_to_response(x) for x in items]


@router.post("/my/mark-reviewed-seen", response_model=MarkNotificationsSeenResponse)
def mark_my_reviewed_training_proposals_seen(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = utcnow()
    reviewed_statuses = [
        TrainingProposalStatus.APPROVED.value,
        TrainingProposalStatus.LINKED.value,
        TrainingProposalStatus.REJECTED.value,
    ]
    items = db.scalars(
        select(TrainingNameProposal).where(
            TrainingNameProposal.requester_user_id == user.id,
            TrainingNameProposal.status.in_(reviewed_statuses),
            TrainingNameProposal.reviewed_at.is_not(None),
            or_(
                TrainingNameProposal.requester_seen_reviewed_at.is_(None),
                TrainingNameProposal.requester_seen_reviewed_at < TrainingNameProposal.reviewed_at,
            ),
        )
    ).all()
    for item in items:
        item.requester_seen_reviewed_at = now
    if items:
        db.commit()
    return MarkNotificationsSeenResponse(updated=len(items))


@router.get("/hr/inbox", response_model=list[TrainingProposalResponse])
def hr_training_proposals(
    status_value: TrainingProposalStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    stmt = _base_query()
    if status_value is not None:
        stmt = stmt.where(TrainingNameProposal.status == status_value.value)
    stmt = stmt.order_by(TrainingNameProposal.created_at.desc(), TrainingNameProposal.id.desc())
    items = db.scalars(stmt).all()
    return [_to_response(x) for x in items]


@router.get("/{proposal_id}", response_model=TrainingProposalResponse)
def get_training_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    if not x:
        raise HTTPException(status_code=404, detail="Training proposal not found")

    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"} and x.requester_user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _to_response(x)


def _ensure_reviewable(x: TrainingNameProposal):
    if x.status != TrainingProposalStatus.SUBMITTED.value:
        raise HTTPException(status_code=409, detail="Only submitted proposals can be reviewed")


@router.post("/{proposal_id}/approve", response_model=TrainingProposalResponse)
def approve_training_proposal(
    proposal_id: int,
    payload: TrainingProposalApproveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    if not x:
        raise HTTPException(status_code=404, detail="Training proposal not found")
    _ensure_reviewable(x)

    cat = db.get(TrainingCategory, payload.category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Training category not found")

    name_pl = payload.name_pl.strip()
    name_en = (payload.name_en.strip() if payload.name_en else name_pl)
    exists = db.scalar(select(TrainingName.id).where(TrainingName.category_id == payload.category_id, func.lower(TrainingName.name_pl) == name_pl.lower()))
    if exists:
        raise HTTPException(status_code=409, detail="Training already exists in this category")

    tn = TrainingName(
        category_id=payload.category_id,
        name_pl=name_pl,
        name_en=name_en,
        default_cost_per_person=Decimal(str(payload.default_cost_per_person or 0)),
        default_hours_per_person=Decimal(str(payload.default_hours_per_person or 0)),
    )
    db.add(tn)
    db.flush()

    x.status = TrainingProposalStatus.APPROVED.value
    x.review_comment = payload.review_comment.strip() if payload.review_comment else None
    x.reviewed_by_user_id = user.id
    x.reviewed_at = utcnow()
    x.requester_seen_reviewed_at = (x.reviewed_at if x.requester_user_id == user.id else None)
    x.approved_training_name_id = tn.id
    db.commit()
    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    recipient = getattr(x, "requester", None)
    if recipient and recipient.id != user.id:
        send_training_proposal_review_notification(db=db, recipient=recipient, proposal=x)
    return _to_response(x)


@router.post("/{proposal_id}/link", response_model=TrainingProposalResponse)
def link_training_proposal(
    proposal_id: int,
    payload: TrainingProposalLinkRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    if not x:
        raise HTTPException(status_code=404, detail="Training proposal not found")
    _ensure_reviewable(x)

    tn = db.get(TrainingName, payload.training_name_id)
    if not tn:
        raise HTTPException(status_code=404, detail="Training not found")

    x.status = TrainingProposalStatus.LINKED.value
    x.review_comment = payload.review_comment.strip() if payload.review_comment else None
    x.reviewed_by_user_id = user.id
    x.reviewed_at = utcnow()
    x.requester_seen_reviewed_at = (x.reviewed_at if x.requester_user_id == user.id else None)
    x.linked_training_name_id = tn.id
    db.commit()
    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    recipient = getattr(x, "requester", None)
    if recipient and recipient.id != user.id:
        send_training_proposal_review_notification(db=db, recipient=recipient, proposal=x)
    return _to_response(x)


@router.post("/{proposal_id}/reject", response_model=TrainingProposalResponse)
def reject_training_proposal(
    proposal_id: int,
    payload: TrainingProposalRejectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    if not x:
        raise HTTPException(status_code=404, detail="Training proposal not found")
    _ensure_reviewable(x)

    x.status = TrainingProposalStatus.REJECTED.value
    x.review_comment = payload.review_comment.strip()
    x.reviewed_by_user_id = user.id
    x.reviewed_at = utcnow()
    x.requester_seen_reviewed_at = (x.reviewed_at if x.requester_user_id == user.id else None)
    db.commit()
    x = db.scalar(_base_query().where(TrainingNameProposal.id == proposal_id))
    recipient = getattr(x, "requester", None)
    if recipient and recipient.id != user.id:
        send_training_proposal_review_notification(db=db, recipient=recipient, proposal=x)
    return _to_response(x)


def _visible_mandatory_training_stmt(db: Session, user: User):
    role = (getattr(user, "role", None) or "").upper()
    stmt = select(MandatoryTrainingRecord).options(selectinload(MandatoryTrainingRecord.import_batch))
    if role in {"HR", "ADMIN"}:
        return stmt
    allowed = _allowed_area_ids(user)
    if not allowed and getattr(user, "area_id", None):
        allowed = {int(user.area_id)}
    if not allowed:
        return stmt.where(False)
    return stmt.where(MandatoryTrainingRecord.area_id.in_(sorted(allowed)))


EDITOR_INBOX_SCOPE = "editor_inbox"
MANAGER_INBOX_SCOPE = "manager_inbox"
HR_INBOX_SCOPE = "hr_inbox"
HR_TRAINING_PROPOSALS_SCOPE = "hr_training_proposals"
MANDATORY_ALERTS_SCOPE = "mandatory_training_alerts"
PROPOSAL_REVIEWS_SCOPE = "proposal_reviews"


def _coalesce_dt(*values: datetime | None) -> datetime:
    for value in values:
        normalized = ensure_utc(value)
        if normalized is not None:
            return normalized
    return utcnow()


def _max_dt(*values: datetime | None) -> datetime | None:
    normalized = [ensure_utc(value) for value in values if ensure_utc(value) is not None]
    return max(normalized) if normalized else None


def _manager_form_scope(form_id: int) -> str:
    return f"manager_inbox_form:{int(form_id)}"


def _latest_read_at(watermarks: dict[str, datetime], *scopes: str) -> datetime | None:
    values = [ensure_utc(watermarks.get(scope)) for scope in scopes if watermarks.get(scope) is not None]
    return max(values) if values else None


def _is_unread_with_scopes(moment: datetime, watermarks: dict[str, datetime], *scopes: str) -> bool:
    latest_read = _latest_read_at(watermarks, *scopes)
    return latest_read is None or ensure_utc(moment) > latest_read


def _utc_start_of_day(day: date) -> datetime:
    tzinfo = utcnow().tzinfo
    return datetime(day.year, day.month, day.day, tzinfo=tzinfo)


def _is_unread(moment: datetime, watermark: datetime | None) -> bool:
    return watermark is None or moment > watermark


def _get_notification_watermarks(db: Session, user_id: int) -> dict[str, datetime]:
    rows = db.scalars(select(NotificationReadWatermark).where(NotificationReadWatermark.user_id == user_id)).all()
    return {row.scope: ensure_utc(row.read_at) for row in rows}


def _set_notification_watermark(db: Session, user_id: int, scope: str, read_at: datetime) -> None:
    row = db.scalar(
        select(NotificationReadWatermark).where(
            NotificationReadWatermark.user_id == user_id,
            NotificationReadWatermark.scope == scope,
        )
    )
    if row:
        row.read_at = ensure_utc(read_at)
    else:
        db.add(NotificationReadWatermark(user_id=user_id, scope=scope, read_at=ensure_utc(read_at)))


def _editor_inbox_forms(db: Session, user: User) -> list[Form]:
    stmt = (
        select(Form)
        .where(
            Form.created_by_user_id == user.id,
            Form.status == FormStatus.DRAFT.value,
            Form.last_comment.is_not(None),
            Form.last_commented_by_role.is_not(None),
            func.upper(Form.last_commented_by_role) != "EDITOR",
        )
        .order_by(Form.last_commented_at.desc().nullslast(), Form.updated_at.desc().nullslast(), Form.id.desc())
    )
    return db.scalars(stmt).all()


def _manager_inbox_forms(db: Session, user: User) -> list[Form]:
    allowed = _allowed_area_ids(user)
    if allowed is not None and not allowed:
        return []
    stmt = select(Form).where(Form.status == FormStatus.MANAGER_REVIEW.value)
    if allowed is not None:
        stmt = stmt.where(Form.area_id.in_(allowed))
    stmt = stmt.order_by(Form.updated_at.desc().nullslast(), Form.id.desc())
    return db.scalars(stmt).all()


def _manager_final_reply_events(db: Session, user: User):
    allowed = _allowed_area_ids(user)
    if allowed is not None and not allowed:
        return []

    stmt = (
        select(FormEvent)
        .join(Form, Form.id == FormEvent.form_id)
        .where(FormEvent.action.in_(["HR_REPLIED", "HR_CLOSED"]))
        .order_by(FormEvent.created_at.desc(), FormEvent.id.desc())
    )
    if allowed is not None:
        stmt = stmt.where(Form.area_id.in_(allowed))

    rows = db.scalars(stmt).all()
    latest_by_form: dict[int, FormEvent] = {}
    for row in rows:
        if row.form_id not in latest_by_form:
            latest_by_form[row.form_id] = row
    return list(latest_by_form.values())


def _manager_notification_moment_for_form(db: Session, user: User, form_id: int) -> datetime | None:
    allowed = _allowed_area_ids(user)
    form = db.get(Form, form_id)
    if form is None:
        return None
    if allowed is not None and form.area_id not in allowed:
        return None

    if form.status == FormStatus.MANAGER_REVIEW.value:
        return _manager_or_hr_event_at(form)

    latest_event = db.scalar(
        select(FormEvent)
        .join(Form, Form.id == FormEvent.form_id)
        .where(
            FormEvent.form_id == form_id,
            FormEvent.action.in_(["HR_REPLIED", "HR_CLOSED"]),
        )
        .order_by(FormEvent.created_at.desc(), FormEvent.id.desc())
        .limit(1)
    )
    if latest_event is not None:
        return ensure_utc(latest_event.created_at)

    return None


def _latest_unread_scope_moment(db: Session, user: User, scope: str, watermarks: dict[str, datetime]) -> datetime | None:
    if scope == EDITOR_INBOX_SCOPE:
        moments = [
            _editor_inbox_event_at(f)
            for f in _editor_inbox_forms(db, user)
            if _is_unread_with_scopes(_editor_inbox_event_at(f), watermarks, EDITOR_INBOX_SCOPE)
        ]
        return max(moments) if moments else None

    if scope == MANAGER_INBOX_SCOPE:
        moments: list[datetime] = []
        for f in _manager_inbox_forms(db, user):
            moment = _manager_or_hr_event_at(f)
            if _is_unread_with_scopes(moment, watermarks, MANAGER_INBOX_SCOPE, _manager_form_scope(f.id)):
                moments.append(moment)
        for ev in _manager_final_reply_events(db, user):
            moment = ensure_utc(ev.created_at)
            if _is_unread_with_scopes(moment, watermarks, MANAGER_INBOX_SCOPE, _manager_form_scope(ev.form_id)):
                moments.append(moment)
        return max(moments) if moments else None

    if scope == HR_INBOX_SCOPE:
        moments = [
            _manager_or_hr_event_at(f)
            for f in _hr_inbox_forms(db)
            if _is_unread_with_scopes(_manager_or_hr_event_at(f), watermarks, HR_INBOX_SCOPE)
        ]
        return max(moments) if moments else None

    if scope == HR_TRAINING_PROPOSALS_SCOPE:
        moments = [
            ensure_utc(x.created_at)
            for x in _submitted_training_proposals(db)
            if _is_unread_with_scopes(ensure_utc(x.created_at), watermarks, HR_TRAINING_PROPOSALS_SCOPE)
        ]
        return max(moments) if moments else None

    if scope == MANDATORY_ALERTS_SCOPE:
        moments = [
            _mandatory_alert_started_at(row)
            for row in _mandatory_training_alert_rows(db, user)
            if _is_unread_with_scopes(_mandatory_alert_started_at(row), watermarks, MANDATORY_ALERTS_SCOPE)
        ]
        return max(moments) if moments else None

    return None


def _hr_inbox_forms(db: Session) -> list[Form]:
    stmt = select(Form).where(Form.status == FormStatus.HR_REVIEW.value).order_by(Form.updated_at.desc().nullslast(), Form.id.desc())
    return db.scalars(stmt).all()


def _submitted_training_proposals(db: Session) -> list[TrainingNameProposal]:
    stmt = _base_query().where(TrainingNameProposal.status == TrainingProposalStatus.SUBMITTED.value).order_by(TrainingNameProposal.created_at.desc(), TrainingNameProposal.id.desc())
    return db.scalars(stmt).all()


def _reviewed_training_proposals_for_requester(db: Session, user: User) -> list[TrainingNameProposal]:
    reviewed_statuses = [
        TrainingProposalStatus.APPROVED.value,
        TrainingProposalStatus.LINKED.value,
        TrainingProposalStatus.REJECTED.value,
    ]
    stmt = (
        _base_query()
        .where(
            TrainingNameProposal.requester_user_id == user.id,
            TrainingNameProposal.status.in_(reviewed_statuses),
            TrainingNameProposal.reviewed_at.is_not(None),
            or_(
                TrainingNameProposal.requester_seen_reviewed_at.is_(None),
                TrainingNameProposal.requester_seen_reviewed_at < TrainingNameProposal.reviewed_at,
            ),
        )
        .order_by(TrainingNameProposal.reviewed_at.desc().nullslast(), TrainingNameProposal.id.desc())
    )
    return db.scalars(stmt).all()


def _mandatory_training_alert_rows(db: Session, user: User) -> list[MandatoryTrainingRecord]:
    today = date.today()
    stmt = (
        _visible_mandatory_training_stmt(db, user)
        .where(
            MandatoryTrainingRecord.expiration_date.is_not(None),
            MandatoryTrainingRecord.expiration_date <= today + timedelta(days=30),
        )
        .order_by(MandatoryTrainingRecord.expiration_date.asc(), MandatoryTrainingRecord.employee_name.asc(), MandatoryTrainingRecord.training_name.asc())
    )
    return db.scalars(stmt).all()


def _editor_inbox_event_at(form: Form) -> datetime:
    return _coalesce_dt(form.last_commented_at, form.updated_at, form.created_at)


def _manager_or_hr_event_at(form: Form) -> datetime:
    return _coalesce_dt(form.updated_at, form.created_at)


def _mandatory_alert_started_at(row: MandatoryTrainingRecord) -> datetime:
    threshold_at = _utc_start_of_day(row.expiration_date - timedelta(days=30))
    imported_at = getattr(getattr(row, "import_batch", None), "imported_at", None)
    if imported_at is None:
        return threshold_at
    return max(threshold_at, imported_at)


def _mandatory_training_alert_items_from_rows(rows: list[MandatoryTrainingRecord]) -> list[NotificationItem]:
    today = date.today()
    items: list[NotificationItem] = []
    for row in rows:
        days = (row.expiration_date - today).days
        if days < 0:
            title = f"Szkolenie po terminie: {row.training_name}"
            body = f"{row.employee_name} · {row.cost_center_code} · {abs(days)} dni po terminie"
        elif days == 0:
            title = f"Szkolenie wygasa dzisiaj: {row.training_name}"
            body = f"{row.employee_name} · {row.cost_center_code}"
        else:
            title = f"Szkolenie wygasa za {days} dni: {row.training_name}"
            body = f"{row.employee_name} · {row.cost_center_code}"
        items.append(
            NotificationItem(
                kind="mandatory_training",
                title=title,
                body=body,
                url="/mandatory-trainings",
                created_at=_mandatory_alert_started_at(row),
            )
        )
    return items


def _build_notification_summary_data(db: Session, user: User) -> tuple[NotificationCounts, NotificationCounts, list[NotificationItem]]:
    role = (getattr(user, "role", None) or "").upper()
    counts = NotificationCounts()
    unread_counts = NotificationCounts()
    items: list[NotificationItem] = []
    watermarks = _get_notification_watermarks(db, user.id)

    if role == "EDITOR":
        editor_forms = _editor_inbox_forms(db, user)
        counts.editor_inbox = len(editor_forms)
        unread_editor_forms = [f for f in editor_forms if _is_unread(_editor_inbox_event_at(f), watermarks.get(EDITOR_INBOX_SCOPE))]
        unread_counts.editor_inbox = len(unread_editor_forms)
        for f in unread_editor_forms[:5]:
            items.append(
                NotificationItem(
                    kind="editor_inbox",
                    title=f"Wniosek #{f.id} wymaga poprawek",
                    body=f.last_comment,
                    url=f"/forms/{f.id}",
                    created_at=_editor_inbox_event_at(f),
                    form_id=f.id,
                )
            )

    if role == "MANAGER":
        manager_forms = _manager_inbox_forms(db, user)
        unread_manager_forms = [
            f
            for f in manager_forms
            if _is_unread_with_scopes(_manager_or_hr_event_at(f), watermarks, MANAGER_INBOX_SCOPE, _manager_form_scope(f.id))
        ]
        manager_final_events = _manager_final_reply_events(db, user)
        unread_manager_final_events = [
            ev
            for ev in manager_final_events
            if _is_unread_with_scopes(ensure_utc(ev.created_at), watermarks, MANAGER_INBOX_SCOPE, _manager_form_scope(ev.form_id))
        ]

        counts.manager_inbox = len(manager_forms) + len(manager_final_events)
        unread_counts.manager_inbox = len(unread_manager_forms) + len(unread_manager_final_events)

        for f in unread_manager_forms[:5]:
            items.append(
                NotificationItem(
                    kind="manager_inbox",
                    title=f"Wniosek #{f.id} czeka na decyzję",
                    body=None,
                    url=f"/forms/{f.id}",
                    created_at=_manager_or_hr_event_at(f),
                    form_id=f.id,
                )
            )

        for ev in unread_manager_final_events[:5]:
            decision = ((ev.meta or {}).get("decision") or "").upper()

            decision_map = {
                "APPROVED": "zaakceptował",
                "PARTIAL": "zaakceptował",  # historical compatibility
                "REJECTED": "odrzucił",
            }

            title = f"HR zakończył obsługę wniosku #{ev.form_id}"
            body = None

            if ev.action == "HR_CLOSED":
                title = f"HR zamknął wniosek #{ev.form_id}"
                body = ev.comment or None
            elif decision:
                title = f"HR {decision_map.get(decision, 'odpowiedział na')} wniosek #{ev.form_id}"
                body = ev.comment or None

            items.append(
                NotificationItem(
                    kind="manager_inbox",
                    title=title,
                    body=body,
                    url=f"/forms/{ev.form_id}",
                    created_at=ensure_utc(ev.created_at),
                    form_id=ev.form_id,
                )
            )

    if role in {"HR", "ADMIN"}:
        hr_forms = _hr_inbox_forms(db)
        counts.hr_inbox = len(hr_forms)
        unread_hr_forms = [f for f in hr_forms if _is_unread(_manager_or_hr_event_at(f), watermarks.get(HR_INBOX_SCOPE))]
        unread_counts.hr_inbox = len(unread_hr_forms)
        for f in unread_hr_forms[:4]:
            items.append(
                NotificationItem(
                    kind="hr_inbox",
                    title=f"Wniosek #{f.id} czeka na odpowiedź HR",
                    body=None,
                    url=f"/forms/{f.id}",
                    created_at=_manager_or_hr_event_at(f),
                    form_id=f.id,
                )
            )

        submitted_props = _submitted_training_proposals(db)
        counts.hr_training_proposals = len(submitted_props)
        unread_submitted_props = [x for x in submitted_props if _is_unread(x.created_at, watermarks.get(HR_TRAINING_PROPOSALS_SCOPE))]
        unread_counts.hr_training_proposals = len(unread_submitted_props)
        for x in unread_submitted_props[:4]:
            items.append(
                NotificationItem(
                    kind="training_proposal",
                    title=f"Nowa propozycja szkolenia: {x.name}",
                    body=(x.requester.full_name if x.requester else None),
                    url=f"/training-proposals?focus={x.id}",
                    created_at=x.created_at,
                )
            )

    reviewed = _reviewed_training_proposals_for_requester(db, user)
    counts.proposal_reviews = len(reviewed)
    unread_counts.proposal_reviews = len(reviewed)
    for x in reviewed[:4]:
        if x.reviewed_at is None:
            continue
        title_map = {
            TrainingProposalStatus.APPROVED.value: f"Propozycja '{x.name}' została zaakceptowana",
            TrainingProposalStatus.LINKED.value: f"Propozycja '{x.name}' została powiązana z istniejącym szkoleniem",
            TrainingProposalStatus.REJECTED.value: f"Propozycja '{x.name}' została odrzucona",
        }
        items.append(
            NotificationItem(
                kind="proposal_reviewed",
                title=title_map.get(x.status, x.name),
                body=x.review_comment,
                url=f"/training-proposals?focus={x.id}",
                created_at=x.reviewed_at,
            )
        )

    mandatory_rows = _mandatory_training_alert_rows(db, user)
    counts.mandatory_training_alerts = len(mandatory_rows)
    unread_mandatory_rows = [row for row in mandatory_rows if _is_unread(_mandatory_alert_started_at(row), watermarks.get(MANDATORY_ALERTS_SCOPE))]
    unread_counts.mandatory_training_alerts = len(unread_mandatory_rows)
    items.extend(_mandatory_training_alert_items_from_rows(unread_mandatory_rows[:4]))

    items.sort(key=lambda x: x.created_at, reverse=True)
    return counts, unread_counts, items[:10]


@notifications_router.get("/summary", response_model=NotificationSummaryResponse)
def notifications_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    counts, unread_counts, items = _build_notification_summary_data(db, user)
    return NotificationSummaryResponse(counts=counts, unread_counts=unread_counts, items=items)


@notifications_router.post("/mark-read", response_model=MarkNotificationsSeenResponse)
def mark_notifications_read(
    payload: MarkNotificationScopesRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    requested = {str(scope).strip() for scope in (payload.scopes or []) if str(scope).strip()}
    requested_form_ids = sorted({int(form_id) for form_id in (payload.form_ids or []) if int(form_id) > 0})
    if not requested:
        return MarkNotificationsSeenResponse(updated=0)

    _, unread_counts, _ = _build_notification_summary_data(db, user)
    watermarks = _get_notification_watermarks(db, user.id)
    now = utcnow()
    updated = 0

    if EDITOR_INBOX_SCOPE in requested and role in {"EDITOR", "ADMIN"} and unread_counts.editor_inbox > 0:
        latest = _latest_unread_scope_moment(db, user, EDITOR_INBOX_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, EDITOR_INBOX_SCOPE, latest)
            updated += unread_counts.editor_inbox

    if MANAGER_INBOX_SCOPE in requested and role in {"MANAGER", "ADMIN"}:
        if requested_form_ids:
            for form_id in requested_form_ids:
                moment = _manager_notification_moment_for_form(db, user, form_id)
                if moment is None:
                    continue
                if _is_unread_with_scopes(moment, watermarks, MANAGER_INBOX_SCOPE, _manager_form_scope(form_id)):
                    _set_notification_watermark(db, user.id, _manager_form_scope(form_id), moment)
                    watermarks[_manager_form_scope(form_id)] = moment
                    updated += 1
        elif unread_counts.manager_inbox > 0:
            latest = _latest_unread_scope_moment(db, user, MANAGER_INBOX_SCOPE, watermarks)
            if latest is not None:
                _set_notification_watermark(db, user.id, MANAGER_INBOX_SCOPE, latest)
                updated += unread_counts.manager_inbox

    if HR_INBOX_SCOPE in requested and role in {"HR", "ADMIN"} and unread_counts.hr_inbox > 0:
        latest = _latest_unread_scope_moment(db, user, HR_INBOX_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, HR_INBOX_SCOPE, latest)
            updated += unread_counts.hr_inbox

    if HR_TRAINING_PROPOSALS_SCOPE in requested and role in {"HR", "ADMIN"} and unread_counts.hr_training_proposals > 0:
        latest = _latest_unread_scope_moment(db, user, HR_TRAINING_PROPOSALS_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, HR_TRAINING_PROPOSALS_SCOPE, latest)
            updated += unread_counts.hr_training_proposals

    if MANDATORY_ALERTS_SCOPE in requested and unread_counts.mandatory_training_alerts > 0:
        latest = _latest_unread_scope_moment(db, user, MANDATORY_ALERTS_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, MANDATORY_ALERTS_SCOPE, latest)
            updated += unread_counts.mandatory_training_alerts

    if PROPOSAL_REVIEWS_SCOPE in requested:
        reviewed_items = _reviewed_training_proposals_for_requester(db, user)
        for item in reviewed_items:
            item.requester_seen_reviewed_at = now
        updated += len(reviewed_items)

    if updated > 0:
        db.commit()

    return MarkNotificationsSeenResponse(updated=updated)


@notifications_router.post("/mark-all-read", response_model=MarkNotificationsSeenResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = (getattr(user, "role", None) or "").upper()
    _, unread_counts, _ = _build_notification_summary_data(db, user)
    watermarks = _get_notification_watermarks(db, user.id)
    now = utcnow()
    updated = 0

    if role == "EDITOR" and unread_counts.editor_inbox > 0:
        latest = _latest_unread_scope_moment(db, user, EDITOR_INBOX_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, EDITOR_INBOX_SCOPE, latest)
            updated += unread_counts.editor_inbox

    if role == "MANAGER" and unread_counts.manager_inbox > 0:
        latest = _latest_unread_scope_moment(db, user, MANAGER_INBOX_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, MANAGER_INBOX_SCOPE, latest)
            updated += unread_counts.manager_inbox

    if role in {"HR", "ADMIN"}:
        if unread_counts.hr_inbox > 0:
            latest = _latest_unread_scope_moment(db, user, HR_INBOX_SCOPE, watermarks)
            if latest is not None:
                _set_notification_watermark(db, user.id, HR_INBOX_SCOPE, latest)
                updated += unread_counts.hr_inbox
        if unread_counts.hr_training_proposals > 0:
            latest = _latest_unread_scope_moment(db, user, HR_TRAINING_PROPOSALS_SCOPE, watermarks)
            if latest is not None:
                _set_notification_watermark(db, user.id, HR_TRAINING_PROPOSALS_SCOPE, latest)
                updated += unread_counts.hr_training_proposals

    if unread_counts.mandatory_training_alerts > 0:
        latest = _latest_unread_scope_moment(db, user, MANDATORY_ALERTS_SCOPE, watermarks)
        if latest is not None:
            _set_notification_watermark(db, user.id, MANDATORY_ALERTS_SCOPE, latest)
            updated += unread_counts.mandatory_training_alerts

    reviewed_items = _reviewed_training_proposals_for_requester(db, user)
    for item in reviewed_items:
        item.requester_seen_reviewed_at = now
    updated += len(reviewed_items)

    if updated > 0:
        db.commit()

    return MarkNotificationsSeenResponse(updated=updated)
