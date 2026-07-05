# app/api/routes/forms.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, exists, and_, or_, delete as sa_delete
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.time import ensure_utc, utcnow
from app.models.collection_window import CollectionWindow
from app.models.cost_center import CostCenter
from app.models.enums import FormStatus, HrDecision
from app.models.form import Form
from app.models.form_event import FormEvent
from app.models.form_item import FormItem
from app.models.user import User
from app.services.notification_emails import send_hr_reply_notification
from app.schemas.forms import (
    CommentRequest,
    FormCreateRequest,
    FormDetailsResponse,
    FormEventResponse,
    FormItemCreateRequest,
    FormItemResponse,
    FormItemUpdateRequest,
    FormListResponse,
    FormResponse,
    HrReplyRequest,
    HrBudgetUpdateRequest,
    HrItemUpdateRequest,
)

router = APIRouter(prefix="/forms", tags=["forms"])


# --------- helpers ---------
def get_or_create_collection_window(db: Session) -> CollectionWindow:
    """
    Gwarantuje, że istnieje CollectionWindow.
    Jeśli brak rekordu -> tworzy domyślne okno (is_open=True).
    """
    win = db.scalar(select(CollectionWindow).order_by(CollectionWindow.id.asc()).limit(1))
    if win:
        return win

    win = CollectionWindow(is_open=True)
    db.add(win)
    db.flush()  # nada ID
    return win


def ensure_collection_open(db: Session) -> CollectionWindow:
    """
    Zwraca okno; rzuca 403 jeśli zamknięte.
    """
    win = get_or_create_collection_window(db)
    if not win.is_open:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Collection is closed")
    return win


def ensure_collection_open_for_editing(db: Session, user: User) -> CollectionWindow:
    """Blokuje operacje edycyjne dla EDITOR/MANAGER, gdy okno zbierania jest zamknięte.

    HR/ADMIN mogą nadal przeglądać i domykać workflow.
    """

    win = get_or_create_collection_window(db)
    role = (getattr(user, "role", None) or "").upper()
    if not win.is_open and role in {"EDITOR", "MANAGER"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Collection is closed")
    return win


def is_hr_returned_for_changes(form: Form) -> bool:
    """Czy wniosek jest cofnięty przez HR do poprawki.

    Taki wniosek wraca na MANAGER_REVIEW, ale nie jest zwykłą weryfikacją managera:
    manager/editor muszą móc nanieść poprawki i wysłać go do HR ponownie,
    nawet jeśli okno zbierania nowych wniosków jest już zamknięte.
    """

    return (
        form.status == FormStatus.MANAGER_REVIEW.value
        and form.last_comment is not None
        and (form.last_commented_by_role or "").upper() in {"HR", "ADMIN"}
    )


def ensure_collection_open_for_form_editing(db: Session, user: User, form: Form) -> CollectionWindow:
    """Blokuje nowe/standardowe edycje po zamknięciu okna, ale pozwala na poprawki po HR.

    Okno zbierania ma blokować tworzenie i zwykłe poprawki, natomiast nie powinno
    blokować obsługi workflow, który HR jawnie cofnęło do korekty.
    """

    win = get_or_create_collection_window(db)
    role = (getattr(user, "role", None) or "").upper()
    if not win.is_open and role in {"EDITOR", "MANAGER"} and not is_hr_returned_for_changes(form):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Collection is closed")
    return win


def allowed_area_ids(user: User) -> "Optional[set[int]]":
    """Return allowed area ids for a user.

    - HR/ADMIN: None (no area scoping restrictions)
    - EDITOR/MANAGER: set of area IDs (possibly empty => no access)
    """
    role = (user.role or "").upper()
    if role in {"HR", "ADMIN"}:
        return None

    return {a.id for a in (user.areas or [])}


def require_roles(user: User, allowed: set[str]):
    role = (getattr(user, "role", None) or "").upper()
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


def ensure_manager_area_access(user: User, form: Form):
    if (getattr(user, "role", None) or "").upper() != "MANAGER":
        return

    allowed = allowed_area_ids(user)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Manager has no areas assigned")
    if form.area_id not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Area not allowed")


def can_view_form(user: User, form: Form) -> bool:
    # autor zawsze
    if form.created_by_user_id == user.id:
        return True

    role = (getattr(user, "role", None) or "").upper()

    # HR/ADMIN widzi tylko nie-DRAFT
    if role in {"HR", "ADMIN"} and form.status != FormStatus.DRAFT.value:
        return True

    # MANAGER widzi wnioski ze swoich Area (także DRAFT)
    if role == "MANAGER":
        allowed = allowed_area_ids(user)
        if not allowed:
            return False
        return form.area_id in allowed

    # EDITOR: wnioski z przypisanych Area, ale dopiero po wyjściu ze szkicu
    # (żeby nie widzieć cudzych szkiców)
    if role == "EDITOR" and form.status != FormStatus.DRAFT.value:
        allowed = allowed_area_ids(user)
        if not allowed:
            return False
        return form.area_id in allowed

    return False


EDITABLE_ITEM_STATUSES = {
    FormStatus.DRAFT.value,
    FormStatus.MANAGER_REVIEW.value,
}


def ensure_form_items_editable(db: Session, user: User, form: Form):
    """Reguły edycji pozycji (FormItem).

    - DRAFT / MANAGER_REVIEW: edycja dozwolona (do momentu wysłania przez managera do HR)
    - HR_REVIEW / CLOSED: tylko odczyt

    Uprawnienia:
    - ADMIN: zawsze
    - MANAGER: gdy ma dostęp do Area
    - EDITOR:
        * w DRAFT: tylko autor
        * w MANAGER_REVIEW: każdy EDITOR z przypisanego Area (żeby mógł poprawiać po odesłaniu z HR)
    """

    if form.status not in EDITABLE_ITEM_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Form is not editable")

    role = (getattr(user, "role", None) or "").upper()
    if role == "ADMIN":
        return
    if role == "MANAGER":
        ensure_manager_area_access(user, form)
        return

    if role == "EDITOR":
        if form.status == FormStatus.DRAFT.value:
            if form.created_by_user_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
            return

        # MANAGER_REVIEW: editor może edytować tylko wtedy, gdy HR cofnęło wniosek do poprawki.
        # Zwykła weryfikacja managera po pierwszym wysłaniu pozostaje tylko do decyzji managera.
        if not is_hr_returned_for_changes(form):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        allowed = allowed_area_ids(user)
        if not allowed or form.area_id not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def ensure_form_deletable(db: Session, form: Form):
    """Allow deletion only before the request reaches HR.

    Important nuance: a form can return to MANAGER_REVIEW/DRAFT after HR requested changes,
    but it has already reached HR and must NOT be deletable then.
    """

    # Block if currently in/after HR
    if form.status in {FormStatus.HR_REVIEW.value, FormStatus.REPLIED.value, FormStatus.CLOSED.value}:
        raise HTTPException(status_code=409, detail="Form already submitted to HR and cannot be deleted.")

    # Only allow early statuses
    if form.status not in {FormStatus.DRAFT.value, FormStatus.MANAGER_REVIEW.value}:
        raise HTTPException(status_code=409, detail="Form cannot be deleted in this status.")

    # If it ever transitioned TO HR_REVIEW, it already reached HR (even if later returned)
    ever_to_hr = db.scalar(
        select(
            exists().where(
                and_(FormEvent.form_id == form.id, FormEvent.to_status == FormStatus.HR_REVIEW.value)
            )
        )
    )
    if ever_to_hr:
        raise HTTPException(status_code=409, detail="Form already submitted to HR and cannot be deleted.")


def set_comment(form: Form, user: User, comment: str | None):
    if comment:
        form.last_comment = comment
        form.last_commented_by_role = getattr(user, "role", None)
        form.last_commented_at = utcnow()


def validate_item_refs(db: Session, training_category_id: int, training_name_id: int, business_need_id: int):
    from app.models.business_need import BusinessNeed
    from app.models.training_category import TrainingCategory
    from app.models.training_name import TrainingName

    cat = db.get(TrainingCategory, training_category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid training_category_id")

    tn = db.get(TrainingName, training_name_id)
    if not tn:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid training_name_id")
    if tn.category_id != training_category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="training_name_id does not belong to training_category_id",
        )

    bn = db.get(BusinessNeed, business_need_id)
    if not bn:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business_need_id")


def validate_cost_center_in_area(db: Session, *, cost_center_id: int, area_id: int):
    ok = db.scalar(
        select(CostCenter.id)
        .where(CostCenter.id == cost_center_id)
        .where(CostCenter.area_id == area_id)
    )
    if ok is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cost center not in form area")


def _jsonable(x: Any):
    if x is None:
        return None
    try:
        if hasattr(x, "quantize"):
            return float(x)
    except Exception:
        pass

    if isinstance(x, datetime):
        return x.isoformat()

    if isinstance(x, (set, tuple)):
        return list(x)

    return x


def to_form_response(form: Form) -> FormResponse:
    return FormResponse(
        id=form.id,
        area_id=form.area_id,
        cost_center_id=form.cost_center_id,
        created_by_user_id=form.created_by_user_id,
        created_by_full_name=(getattr(getattr(form, "creator", None), "full_name", None)),
        status=form.status,
        created_at=ensure_utc(getattr(form, "created_at", None)),
        updated_at=ensure_utc(getattr(form, "updated_at", None)),
        last_comment=getattr(form, "last_comment", None),
        last_commented_by_role=getattr(form, "last_commented_by_role", None),
        last_commented_at=ensure_utc(getattr(form, "last_commented_at", None)),

        hr_budget_total=float(getattr(form, "hr_budget_total", None)) if getattr(form, "hr_budget_total", None) is not None else None,
        hr_decision=getattr(form, "hr_decision", None),
        hr_comment=getattr(form, "hr_comment", None),
    )


def to_item_response(item: FormItem) -> FormItemResponse:
    return FormItemResponse(
        id=item.id,
        form_id=item.form_id,
        cost_center_id=item.cost_center_id,
        training_category_id=item.training_category_id,
        training_name_id=item.training_name_id,
        priority=item.priority,
        quarter=item.quarter,
        business_need_id=item.business_need_id,
        employees_count=item.employees_count,
        employee_full_name=item.employee_full_name,
        estimated_cost_per_person=float(item.estimated_cost_per_person),
        estimated_hours_per_person=float(item.estimated_hours_per_person),
        contact_person=item.contact_person,
        notes=item.notes,
        hr_budget_total=float(item.hr_budget_total) if item.hr_budget_total is not None else None,
        hr_decision=item.hr_decision,
        hr_comment=item.hr_comment,
    )


def to_event_response(ev: FormEvent) -> FormEventResponse:
    return FormEventResponse(
        id=ev.id,
        form_id=ev.form_id,
        action=ev.action,
        actor_user_id=ev.actor_user_id,
        actor_full_name=(getattr(getattr(ev, "actor", None), "full_name", None)),
        actor_role=ev.actor_role,
        from_status=ev.from_status,
        to_status=ev.to_status,
        item_id=ev.item_id,
        comment=ev.comment,
        meta=ev.meta,
        created_at=ensure_utc(ev.created_at),
    )


def log_event(
    db: Session,
    *,
    form: Form,
    user: User,
    action: str,
    from_status: str | None = None,
    to_status: str | None = None,
    item_id: int | None = None,
    comment: str | None = None,
    meta: dict | None = None,
):
    ev = FormEvent(
        form_id=form.id,
        actor_user_id=user.id,
        actor_role=getattr(user, "role", None),
        action=action,
        from_status=from_status,
        to_status=to_status,
        item_id=item_id,
        comment=comment,
        meta=meta,
    )
    db.add(ev)


def _paginate(limit: int, offset: int) -> tuple[int, int]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    return limit, offset


SortBy = Literal["created_at", "updated_at", "id", "status"]
SortDir = Literal["desc", "asc"]


def _build_forms_query(
    *,
    base,
    status_value: str | None = None,
    area_id: int | None = None,
    cost_center_id: int | None = None,
    created_by_user_id: int | None = None,
    sort_by: SortBy = "id",
    sort_dir: SortDir = "desc",
):
    q = base
    if status_value is not None:
        q = q.where(Form.status == status_value)
    if area_id is not None:
        q = q.where(Form.area_id == area_id)
    if cost_center_id is not None:
        # ✅ cost_center_id jest legacy na Form, ale docelowo jest per-pozycja.
        # Traktujemy filtr jako: (Form.cost_center_id == X) LUB (jakakolwiek pozycja ma X)
        has_item_cc = exists(
            select(1)
            .select_from(FormItem)
            .where(and_(FormItem.form_id == Form.id, FormItem.cost_center_id == cost_center_id))
        )
        q = q.where(or_(Form.cost_center_id == cost_center_id, has_item_cc))
    if created_by_user_id is not None:
        q = q.where(Form.created_by_user_id == created_by_user_id)

    col = {
        "created_at": getattr(Form, "created_at", Form.id),
        "updated_at": getattr(Form, "updated_at", Form.id),
        "id": Form.id,
        "status": Form.status,
    }[sort_by]

    q = q.order_by(col.desc() if sort_dir == "desc" else col.asc())
    return q


def _count_total(db: Session, query) -> int:
    return int(db.scalar(select(func.count()).select_from(query.subquery())) or 0)


# --------- endpoints ---------
@router.post("", response_model=FormResponse)
def create_form(
    payload: FormCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # DB ma NOT NULL na collection_window_id
    win = ensure_collection_open_for_editing(db, user)

    role = (getattr(user, "role", None) or "").upper()
    if role in {"EDITOR", "MANAGER"}:
        allowed = allowed_area_ids(user)
        if allowed is None:
            pass
        elif not allowed:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User has no areas assigned")
        elif payload.area_id not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Area not allowed")

    # legacy – opcjonalne
    if payload.cost_center_id is not None:
        ok = db.scalar(
            select(CostCenter.id)
            .where(CostCenter.id == payload.cost_center_id)
            .where(CostCenter.area_id == payload.area_id)
        )
        if ok is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cost center not in area")

    form = Form(
        collection_window_id=win.id,
        area_id=payload.area_id,
        cost_center_id=payload.cost_center_id,
        created_by_user_id=user.id,
        status=FormStatus.DRAFT.value,
    )
    db.add(form)
    db.flush()

    log_event(
        db,
        form=form,
        user=user,
        action="FORM_CREATED",
        from_status=None,
        to_status=form.status,
        meta={"area_id": form.area_id, "cost_center_id": form.cost_center_id, "collection_window_id": win.id},
    )

    db.commit()
    db.refresh(form)
    return to_form_response(form)


@router.get("/my", response_model=FormListResponse)
def my_forms(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_value: str | None = Query(None, alias="status"),
    sort_by: SortBy = Query("id"),
    sort_dir: SortDir = Query("desc"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    limit, offset = _paginate(limit, offset)

    if status_value is not None:
        allowed = {s.value for s in FormStatus}
        if status_value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Allowed: {sorted(allowed)}",
            )

    base = _build_forms_query(
        base=select(Form).where(Form.created_by_user_id == user.id),
        status_value=status_value,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    total = _count_total(db, base)
    forms = db.scalars(base.limit(limit).offset(offset)).all()
    return FormListResponse(items=[to_form_response(f) for f in forms], total=total, limit=limit, offset=offset)


@router.get("/manager/inbox", response_model=FormListResponse)
def manager_inbox(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    area_id: int | None = Query(None, ge=1),
    cost_center_id: int | None = Query(None, ge=1),
    created_by_user_id: int | None = Query(None, ge=1),
    sort_by: SortBy = Query("id"),
    sort_dir: SortDir = Query("desc"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"MANAGER", "ADMIN"})
    limit, offset = _paginate(limit, offset)

    role = (getattr(user, "role", None) or "").upper()

    if role == "MANAGER":
        allowed = allowed_area_ids(user)
        if not allowed:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Manager has no areas assigned")

        if area_id is None:
            base = select(Form).where(Form.area_id.in_(allowed))
            effective_area_id = None
        else:
            if area_id not in allowed:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Area not allowed")
            base = select(Form)
            effective_area_id = area_id
    else:
        base = select(Form)
        effective_area_id = area_id

    # Manager inbox + historia: wnioski w obszarach managera
    # - MANAGER_REVIEW: do akcji
    # - HR_REVIEW/REPLIED/CLOSED: historia (żeby manager nie "tracił" wniosków po wysłaniu do HR)
    base = base.where(
        Form.status.in_(
            [
                FormStatus.MANAGER_REVIEW.value,
                FormStatus.HR_REVIEW.value,
                FormStatus.REPLIED.value,
                FormStatus.CLOSED.value,
            ]
        )
    )

    base = _build_forms_query(
        base=base,
        status_value=None,
        area_id=effective_area_id,
        cost_center_id=cost_center_id,
        created_by_user_id=created_by_user_id,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    total = _count_total(db, base)
    forms = db.scalars(base.limit(limit).offset(offset)).all()
    return FormListResponse(items=[to_form_response(f) for f in forms], total=total, limit=limit, offset=offset)




@router.get("/editor/inbox", response_model=FormListResponse)
def editor_inbox(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    area_id: int | None = Query(None, ge=1),
    cost_center_id: int | None = Query(None, ge=1),
    created_by_user_id: int | None = Query(None, ge=1),
    sort_by: SortBy = Query("id"),
    sort_dir: SortDir = Query("desc"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Inbox dla EDITOR: wnioski wymagające poprawy.

    Obsługujemy dwa scenariusze:
    - Manager odsyła autorowi do poprawy: DRAFT + komentarz od MANAGER/ADMIN.
    - HR cofa do poprawki: MANAGER_REVIEW + komentarz od HR/ADMIN.
      W tym wariancie editorzy przypisani do Area mogą poprawić pozycje,
      a manager ponownie wysyła wniosek do HR.
    """

    require_roles(user, {"EDITOR", "ADMIN"})
    limit, offset = _paginate(limit, offset)

    role = (getattr(user, "role", None) or "").upper()
    base = select(Form)

    # "Do poprawy" zawsze wymaga komentarza z roli innej niż EDITOR.
    base = base.where(Form.last_comment.isnot(None))
    base = base.where(Form.last_commented_by_role.isnot(None))
    base = base.where(func.upper(Form.last_commented_by_role) != "EDITOR")

    if role == "EDITOR":
        allowed = allowed_area_ids(user) or set()

        # DRAFT: tylko własne wnioski odesłane przez managera.
        own_draft_returned = and_(
            Form.status == FormStatus.DRAFT.value,
            Form.created_by_user_id == user.id,
        )

        # MANAGER_REVIEW: wnioski z obszarów editora cofnięte przez HR/ADMIN.
        # To pozwala editorowi poprawić pozycje po decyzji "Cofnięte do poprawki".
        area_returned_by_hr = and_(
            Form.status == FormStatus.MANAGER_REVIEW.value,
            Form.area_id.in_(allowed) if allowed else False,
            func.upper(Form.last_commented_by_role).in_(["HR", "ADMIN"]),
        )

        base = base.where(or_(own_draft_returned, area_returned_by_hr))
        effective_created_by = None  # ignorujemy query param dla EDITOR
    else:
        # ADMIN widzi oba typy pozycji do poprawy i może filtrować po autorze.
        base = base.where(Form.status.in_([FormStatus.DRAFT.value, FormStatus.MANAGER_REVIEW.value]))
        effective_created_by = created_by_user_id

    base = _build_forms_query(
        base=base,
        status_value=None,
        area_id=area_id,
        cost_center_id=cost_center_id,
        created_by_user_id=effective_created_by,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    total = _count_total(db, base)
    forms = db.scalars(base.limit(limit).offset(offset)).all()
    return FormListResponse(items=[to_form_response(f) for f in forms], total=total, limit=limit, offset=offset)


@router.get("/hr/inbox", response_model=FormListResponse)
def hr_inbox(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    area_id: int | None = Query(None, ge=1),
    cost_center_id: int | None = Query(None, ge=1),
    created_by_user_id: int | None = Query(None, ge=1),
    sort_by: SortBy = Query("id"),
    sort_dir: SortDir = Query("desc"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"HR", "ADMIN"})
    limit, offset = _paginate(limit, offset)

    base = _build_forms_query(
        base=select(Form),
        status_value=FormStatus.HR_REVIEW.value,
        area_id=area_id,
        cost_center_id=cost_center_id,
        created_by_user_id=created_by_user_id,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    total = _count_total(db, base)
    forms = db.scalars(base.limit(limit).offset(offset)).all()
    return FormListResponse(items=[to_form_response(f) for f in forms], total=total, limit=limit, offset=offset)


@router.get("/list", response_model=FormListResponse)
def list_forms_hr_admin(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_value: str | None = Query(None),
    area_id: int | None = Query(None, ge=1),
    cost_center_id: int | None = Query(None, ge=1),
    created_by_user_id: int | None = Query(None, ge=1),
    sort_by: SortBy = Query("id"),
    sort_dir: SortDir = Query("desc"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"HR", "ADMIN"})
    limit, offset = _paginate(limit, offset)

    if status_value is not None:
        allowed = {s.value for s in FormStatus}
        if status_value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Allowed: {sorted(allowed)}",
            )

    base = _build_forms_query(
        base=select(Form).where(Form.status != FormStatus.DRAFT.value),
        status_value=status_value,
        area_id=area_id,
        cost_center_id=cost_center_id,
        created_by_user_id=created_by_user_id,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    total = _count_total(db, base)
    forms = db.scalars(base.limit(limit).offset(offset)).all()
    return FormListResponse(items=[to_form_response(f) for f in forms], total=total, limit=limit, offset=offset)


@router.get("/{form_id}", response_model=FormDetailsResponse)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    if (getattr(user, "role", None) or "").upper() == "MANAGER" and form.status != FormStatus.DRAFT.value:
        ensure_manager_area_access(user, form)

    if not can_view_form(user, form):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    items = db.scalars(
        select(FormItem).where(FormItem.form_id == form.id).order_by(FormItem.id)
    ).all()

    return FormDetailsResponse(
        **to_form_response(form).model_dump(),
        items=[to_item_response(i) for i in items],
    )


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a form only until it reaches HR.

    Allowed roles: EDITOR / MANAGER / ADMIN.
    Blocked once it has been submitted to HR at least once (even if later returned).
    """

    require_roles(user, {"EDITOR", "MANAGER", "ADMIN"})

    # Keep consistency with other edits: block when collection window closed (except admin).
    if (getattr(user, "role", None) or "").upper() != "ADMIN":
        ensure_collection_open_for_editing(db, user)

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    # Access control: editor only own; manager only within their areas
    if (getattr(user, "role", None) or "").upper() != "ADMIN":
        ensure_manager_area_access(user, form)

    ensure_form_deletable(db, form)

    # Remove dependent rows explicitly to avoid FK issues
    db.execute(sa_delete(FormEvent).where(FormEvent.form_id == form.id))
    db.execute(sa_delete(FormItem).where(FormItem.form_id == form.id))
    db.delete(form)
    db.commit()
    return None


@router.get("/{form_id}/history", response_model=list[FormEventResponse])
def form_history(
    form_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    if (getattr(user, "role", None) or "").upper() == "MANAGER" and form.status != FormStatus.DRAFT.value:
        ensure_manager_area_access(user, form)

    if not can_view_form(user, form):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    limit, offset = _paginate(limit, offset)

    events = db.scalars(
        select(FormEvent)
        .where(FormEvent.form_id == form.id)
        .order_by(FormEvent.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return [to_event_response(e) for e in events]


@router.post("/{form_id}/items", response_model=FormItemResponse)
def add_item(
    form_id: int,
    payload: FormItemCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    ensure_collection_open_for_form_editing(db, user, form)
    ensure_form_items_editable(db, user, form)
    validate_item_refs(db, payload.training_category_id, payload.training_name_id, payload.business_need_id)

    # MPK musi należeć do Area wniosku
    validate_cost_center_in_area(db, cost_center_id=payload.cost_center_id, area_id=form.area_id)

    item = FormItem(
        form_id=form.id,
        cost_center_id=payload.cost_center_id,
        training_category_id=payload.training_category_id,
        training_name_id=payload.training_name_id,
        priority=payload.priority,
        quarter=payload.quarter,
        business_need_id=payload.business_need_id,
        employees_count=payload.employees_count,
        employee_full_name=payload.employee_full_name,
        estimated_cost_per_person=payload.estimated_cost_per_person,
        estimated_hours_per_person=payload.estimated_hours_per_person,
        contact_person=payload.contact_person,
        notes=payload.notes,
    )
    db.add(item)
    db.flush()

    log_event(
        db,
        form=form,
        user=user,
        action="ITEM_ADDED",
        from_status=form.status,
        to_status=form.status,
        item_id=item.id,
        meta={
            "cost_center_id": item.cost_center_id,
            "training_category_id": item.training_category_id,
            "training_name_id": item.training_name_id,
            "priority": item.priority,
            "quarter": item.quarter,
            "business_need_id": item.business_need_id,
            "employees_count": item.employees_count,
        },
    )

    db.commit()
    db.refresh(item)
    return to_item_response(item)


@router.patch("/{form_id}/items/{item_id}", response_model=FormItemResponse)
def update_item(
    form_id: int,
    item_id: int,
    payload: FormItemUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    ensure_collection_open_for_form_editing(db, user, form)
    ensure_form_items_editable(db, user, form)

    item = db.get(FormItem, item_id)
    if not item or item.form_id != form.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    if "cost_center_id" in data and data["cost_center_id"] is not None:
        validate_cost_center_in_area(db, cost_center_id=int(data["cost_center_id"]), area_id=form.area_id)

    new_cat_id = data.get("training_category_id", item.training_category_id)
    new_name_id = data.get("training_name_id", item.training_name_id)
    new_need_id = data.get("business_need_id", item.business_need_id)

    if ("training_category_id" in data) or ("training_name_id" in data) or ("business_need_id" in data):
        validate_item_refs(db, new_cat_id, new_name_id, new_need_id)

    diff: dict[str, dict[str, Any]] = {}
    for k, v in data.items():
        diff[k] = {"from": _jsonable(getattr(item, k)), "to": _jsonable(v)}

    for k, v in data.items():
        setattr(item, k, v)

    log_event(
        db,
        form=form,
        user=user,
        action="ITEM_UPDATED",
        from_status=form.status,
        to_status=form.status,
        item_id=item.id,
        meta={"changed": diff},
    )

    db.commit()
    db.refresh(item)
    return to_item_response(item)


@router.delete("/{form_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    form_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    ensure_collection_open_for_form_editing(db, user, form)
    ensure_form_items_editable(db, user, form)

    item = db.get(FormItem, item_id)
    if not item or item.form_id != form.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    meta = {
        "cost_center_id": item.cost_center_id,
        "training_category_id": item.training_category_id,
        "training_name_id": item.training_name_id,
        "priority": item.priority,
        "quarter": item.quarter,
        "business_need_id": item.business_need_id,
        "employees_count": item.employees_count,
    }

    log_event(
        db,
        form=form,
        user=user,
        action="ITEM_DELETED",
        from_status=form.status,
        to_status=form.status,
        item_id=item.id,
        meta=meta,
    )

    db.delete(item)
    db.commit()
    return


@router.post("/{form_id}/submit", response_model=FormResponse)
def submit_form(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ensure_collection_open_for_editing(db, user)

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.created_by_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if form.status != FormStatus.DRAFT.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only DRAFT can be submitted")

    has_items = db.scalar(select(FormItem.id).where(FormItem.form_id == form.id).limit(1))
    if not has_items:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot submit empty form")

    old = form.status
    role = (getattr(user, "role", None) or "").upper()

    # Manager, który sam utworzył wniosek, nie powinien wysyłać go "do siebie".
    # Taki wniosek od razu trafia do HR.
    if role == "MANAGER":
        form.status = FormStatus.HR_REVIEW.value
        action = "MANAGER_SELF_SUBMITTED_TO_HR"
    else:
        form.status = FormStatus.MANAGER_REVIEW.value
        action = "FORM_SUBMITTED"

    log_event(
        db,
        form=form,
        user=user,
        action=action,
        from_status=old,
        to_status=form.status,
    )

    db.commit()
    db.refresh(form)
    return to_form_response(form)


@router.post("/{form_id}/resubmit", response_model=FormResponse)
def resubmit_form(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Endpoint deprecated. Use /submit (status must be DRAFT).",
    )


@router.post("/{form_id}/manager/approve", response_model=FormResponse)
def manager_approve(
    form_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"MANAGER", "ADMIN"})

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    ensure_collection_open_for_form_editing(db, user, form)
    if form.status not in {FormStatus.MANAGER_REVIEW.value}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only MANAGER_REVIEW can be approved by manager",
        )

    ensure_manager_area_access(user, form)

    old = form.status
    form.status = FormStatus.HR_REVIEW.value

    log_event(
        db,
        form=form,
        user=user,
        action="MANAGER_APPROVED",
        from_status=old,
        to_status=form.status,
    )

    db.commit()
    db.refresh(form)
    return to_form_response(form)


@router.post("/{form_id}/manager/request-changes", response_model=FormResponse)
def manager_request_changes(
    form_id: int,
    payload: CommentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"MANAGER", "ADMIN"})

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status != FormStatus.MANAGER_REVIEW.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only MANAGER_REVIEW can be returned for changes by manager",
        )

    ensure_collection_open_for_form_editing(db, user, form)

    if is_hr_returned_for_changes(form):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request returned by HR can be corrected directly and sent again to HR",
        )

    ensure_manager_area_access(user, form)

    set_comment(form, user, payload.comment)

    old = form.status
    form.status = FormStatus.DRAFT.value

    log_event(
        db,
        form=form,
        user=user,
        action="MANAGER_REQUEST_CHANGES",
        from_status=old,
        to_status=form.status,
        comment=payload.comment,
    )

    db.commit()
    db.refresh(form)
    return to_form_response(form)


@router.post("/{form_id}/hr/request-changes", response_model=FormResponse)
def hr_request_changes(
    form_id: int,
    payload: CommentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"HR", "ADMIN"})

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status != FormStatus.HR_REVIEW.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only HR_REVIEW can be returned for changes by HR",
        )

    comment = payload.comment.strip()
    set_comment(form, user, comment)

    # Cofnięcie do poprawki nie jest końcową decyzją HR.
    # Czyścimy finalną decyzję/budżet i zostawiamy komentarz HR jako instrukcję poprawek.
    form.hr_decision = None
    form.hr_budget_total = None
    form.hr_comment = comment

    old = form.status
    # HR prosi o poprawki -> wraca do managera. Manager może poprawić pozycje
    # sam albo zlecić poprawki editorom przypisanym do obszaru.
    form.status = FormStatus.MANAGER_REVIEW.value

    log_event(
        db,
        form=form,
        user=user,
        action="HR_REQUEST_CHANGES",
        from_status=old,
        to_status=form.status,
        comment=comment,
        meta={"outcome": "REQUEST_CHANGES"},
    )

    db.commit()
    db.refresh(form)
    return to_form_response(form)


def _apply_hr_item_update(item: FormItem, data: dict[str, Any]):
    """Wspólna logika aktualizacji pól HR per pozycja."""

    if "hr_budget_total" in data:
        item.hr_budget_total = data["hr_budget_total"]
    if "hr_decision" in data:
        item.hr_decision = data["hr_decision"]
    if "hr_comment" in data:
        item.hr_comment = data["hr_comment"]


@router.patch("/{form_id}/items/{item_id}/hr", response_model=FormItemResponse)
def hr_update_item(
    form_id: int,
    item_id: int,
    payload: HrItemUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"HR", "ADMIN"})

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status != FormStatus.HR_REVIEW.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Budget can be set only in HR_REVIEW")

    item = db.get(FormItem, item_id)
    if not item or item.form_id != form.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    old_budget = float(item.hr_budget_total) if item.hr_budget_total is not None else None
    old_decision = item.hr_decision
    old_comment = item.hr_comment

    _apply_hr_item_update(item, data)

    log_event(
        db,
        form=form,
        user=user,
        action="HR_ITEM_UPDATED",
        from_status=form.status,
        to_status=form.status,
        item_id=item.id,
        meta={
            "changed": {
                "hr_budget_total": {"from": _jsonable(old_budget), "to": _jsonable(item.hr_budget_total)},
                "hr_decision": {"from": _jsonable(old_decision), "to": _jsonable(item.hr_decision)},
                "hr_comment": {"from": _jsonable(old_comment), "to": _jsonable(item.hr_comment)},
            }
        },
    )

    db.commit()
    db.refresh(item)
    return to_item_response(item)


# ✅ kompatybilność: stary endpoint tylko na budżet
@router.patch("/{form_id}/items/{item_id}/hr-budget", response_model=FormItemResponse)
def hr_set_item_budget(
    form_id: int,
    item_id: int,
    payload: HrBudgetUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return hr_update_item(
        form_id=form_id,
        item_id=item_id,
        payload=HrItemUpdateRequest(hr_budget_total=payload.hr_budget_total),
        db=db,
        user=user,
    )


@router.post("/{form_id}/hr/reply", response_model=FormResponse)
def hr_reply(
    form_id: int,
    payload: HrReplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """HR podejmuje decyzję dla całego wniosku.

    - APPROVED: proces kończy się (status → REPLIED, brak dalszej edycji)
    - REJECTED: proces kończy się jako odrzucony (status → REPLIED, brak dalszej edycji)

    Cofnięcie do poprawki jest osobną akcją: /forms/{id}/hr/request-changes.
    """

    require_roles(user, {"HR", "ADMIN"})

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status != FormStatus.HR_REVIEW.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reply can be set only in HR_REVIEW")

    decision = payload.decision
    comment = (payload.comment or "").strip() or None
    budget_total = payload.budget_total

    # Walidacja spójna z procesem. PARTIAL jest wycofane z procesu HR.
    if decision == HrDecision.PARTIAL:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="PARTIAL HR decision is no longer supported")
    if decision == HrDecision.REJECTED:
        if not comment:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Comment is required for REJECTED decision")
    else:
        if budget_total is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="budget_total is required for APPROVED decision")

    # Zapis HR odpowiedzi na nagłówku
    form.hr_decision = decision.value
    form.hr_budget_total = budget_total
    form.hr_comment = comment

    # Ostatni komentarz w historii (dla UI)
    set_comment(form, user, comment)

    old = form.status
    form.status = FormStatus.REPLIED.value
    action = "HR_REJECTED" if decision == HrDecision.REJECTED else "HR_REPLIED"

    log_event(
        db,
        form=form,
        user=user,
        action=action,
        from_status=old,
        to_status=form.status,
        comment=comment,
        meta={
            "decision": decision.value,
            "budget_total": budget_total,
        },
    )

    db.commit()
    db.refresh(form)

    recipient = db.get(User, form.created_by_user_id) if getattr(form, "created_by_user_id", None) else None
    if recipient and recipient.id != user.id:
        send_hr_reply_notification(db=db, recipient=recipient, form=form)

    return to_form_response(form)


@router.post("/{form_id}/hr/close", response_model=FormResponse)
def hr_close(
    form_id: int,
    payload: CommentRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Zamknięcie wniosku przez HR (akceptacja)."""

    require_roles(user, {"HR", "ADMIN"})

    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status not in {FormStatus.HR_REVIEW.value, FormStatus.REPLIED.value}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only HR_REVIEW (or legacy REPLIED) can be closed",
        )

    comment = payload.comment if payload is not None else None
    if comment:
        set_comment(form, user, comment)

    old = form.status
    form.status = FormStatus.CLOSED.value

    log_event(
        db,
        form=form,
        user=user,
        action="HR_CLOSED",
        from_status=old,
        to_status=form.status,
        comment=comment,
    )

    db.commit()
    db.refresh(form)
    return to_form_response(form)
