from __future__ import annotations

from datetime import date, timedelta
from html import escape

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.area_access import get_allowed_area_ids
from app.core.time import utcnow
from app.models.enums import HrDecision, TrainingProposalStatus
from app.models.form import Form
from app.models.mandatory_training_record import MandatoryTrainingRecord
from app.models.training_name_proposal import TrainingNameProposal
from app.models.user import User
from app.services.mail import MailSendResult, send_email_safe

MANDATORY_DIGEST_LOOKAHEAD_DAYS = 30


def _same_iso_week(left: date, right: date) -> bool:
    left_year, left_week, _ = left.isocalendar()
    right_year, right_week, _ = right.isocalendar()
    return left_year == right_year and left_week == right_week


def _lang(user: User | None) -> str:
    value = ((getattr(user, "preferred_language", None) or "pl").strip().lower())
    return "en" if value == "en" else "pl"


def _safe_name(user: User | None) -> str:
    if user is None:
        return "User"
    fallback = "User" if _lang(user) == "en" else "Użytkowniku"
    return (getattr(user, "full_name", None) or getattr(user, "email", None) or fallback).strip()


def _join_lines(lines: list[str]) -> str:
    return "\n".join(lines)


def _hr_decision_label(decision: str | None, lang: str) -> str:
    key = (decision or "").upper()
    if lang == "en":
        return {
            HrDecision.APPROVED.value: "approved",
            HrDecision.PARTIAL.value: "approved",  # historical compatibility
            HrDecision.REJECTED.value: "rejected",
        }.get(key, "updated")
    return {
        HrDecision.APPROVED.value: "zaakceptowany",
        HrDecision.PARTIAL.value: "zaakceptowany",  # historyczna wartość traktowana jak akceptacja
        HrDecision.REJECTED.value: "odrzucony",
    }.get(key, "zaktualizowany")


def send_hr_reply_notification(*, db: Session, recipient: User | None, form: Form) -> MailSendResult | None:
    if recipient is None or not recipient.is_active or recipient.is_pending_activation:
        return None
    if not getattr(recipient, "email_notifications_hr_response", True):
        return None

    lang = _lang(recipient)
    decision_label = _hr_decision_label(getattr(form, "hr_decision", None), lang)
    comment = (getattr(form, "hr_comment", None) or "").strip()
    budget = getattr(form, "hr_budget_total", None)

    if lang == "en":
        subject = f"Training Hub — HR response for request #{form.id}"
        body_lines = [
            f"Hello {_safe_name(recipient)},",
            "",
            f"A new HR response has been added to your request #{form.id}.",
            f"Decision: {decision_label}.",
        ]
        if budget is not None:
            body_lines.append(f"Budget total: {budget}.")
        if comment:
            body_lines.extend(["", "Comment:", comment])
        body_lines.extend(["", "Open Training Hub to review the full request."])
    else:
        subject = f"Training Hub — odpowiedź HR do wniosku #{form.id}"
        body_lines = [
            f"Cześć {_safe_name(recipient)},",
            "",
            f"Do Twojego wniosku #{form.id} została dodana odpowiedź HR.",
            f"Decyzja: {decision_label}.",
        ]
        if budget is not None:
            body_lines.append(f"Budżet łączny: {budget}.")
        if comment:
            body_lines.extend(["", "Komentarz:", comment])
        body_lines.extend(["", "Otwórz Training Hub, aby zobaczyć szczegóły wniosku."])

    return send_email_safe(
        db=db,
        to_email=recipient.email,
        subject=subject,
        body=_join_lines(body_lines),
        kind="hr_reply_notification",
    )


def _proposal_status_label(status: str, lang: str) -> str:
    if lang == "en":
        return {
            TrainingProposalStatus.APPROVED.value: "approved",
            TrainingProposalStatus.LINKED.value: "linked to an existing training",
            TrainingProposalStatus.REJECTED.value: "rejected",
        }.get(status, "updated")
    return {
        TrainingProposalStatus.APPROVED.value: "zaakceptowana",
        TrainingProposalStatus.LINKED.value: "powiązana z istniejącym szkoleniem",
        TrainingProposalStatus.REJECTED.value: "odrzucona",
    }.get(status, "zaktualizowana")


def send_training_proposal_review_notification(*, db: Session, recipient: User | None, proposal: TrainingNameProposal) -> MailSendResult | None:
    if recipient is None or not recipient.is_active or recipient.is_pending_activation:
        return None
    if not getattr(recipient, "email_notifications_proposal_review", True):
        return None

    lang = _lang(recipient)
    review_comment = (getattr(proposal, "review_comment", None) or "").strip()
    status_label = _proposal_status_label(proposal.status, lang)

    if lang == "en":
        subject = f"Training Hub — review of training proposal: {proposal.name}"
        body_lines = [
            f"Hello {_safe_name(recipient)},",
            "",
            f'Your training proposal "{proposal.name}" has been {status_label}.',
        ]
        if review_comment:
            body_lines.extend(["", "Comment:", review_comment])
        body_lines.extend(["", "Open Training Hub to review the full decision."])
    else:
        subject = f"Training Hub — decyzja dla propozycji szkolenia: {proposal.name}"
        body_lines = [
            f"Cześć {_safe_name(recipient)},",
            "",
            f'Twoja propozycja szkolenia "{proposal.name}" została {status_label}.',
        ]
        if review_comment:
            body_lines.extend(["", "Komentarz:", review_comment])
        body_lines.extend(["", "Otwórz Training Hub, aby zobaczyć pełną decyzję."])

    return send_email_safe(
        db=db,
        to_email=recipient.email,
        subject=subject,
        body=_join_lines(body_lines),
        kind="training_proposal_review_notification",
    )


def _visible_mandatory_training_stmt(db: Session, user: User):
    role = (getattr(user, "role", None) or "").upper()
    stmt = select(MandatoryTrainingRecord).options(selectinload(MandatoryTrainingRecord.import_batch))
    if role in {"HR", "ADMIN"}:
        return stmt
    allowed = {int(x) for x in get_allowed_area_ids(db, user)}
    if getattr(user, "area_id", None):
        allowed.add(int(user.area_id))
    if not allowed:
        return stmt.where(False)
    return stmt.where(MandatoryTrainingRecord.area_id.in_(sorted(allowed)))


def _mandatory_row_sort_key(row: MandatoryTrainingRecord):
    return (row.expiration_date or date.max, row.employee_name or "", row.training_name or "")


def _mandatory_employee_label(row: MandatoryTrainingRecord, lang: str) -> str:
    employee_name = (row.employee_name or "-").strip() or "-"
    local_sap_id = (getattr(row, "local_sap_id", None) or "").strip()
    if not local_sap_id:
        return employee_name
    return f"{employee_name} · Local SAP ID: {local_sap_id}"


def _mandatory_digest_subject(lang: str) -> str:
    return (
        "Training Hub — weekly mandatory training digest"
        if lang == "en"
        else "Training Hub — tygodniowe przypomnienie o szkoleniach obowiązkowych"
    )


def _mandatory_status_label(row: MandatoryTrainingRecord, today: date, lang: str) -> str:
    days = (row.expiration_date - today).days
    if days < 0:
        overdue_days = abs(days)
        if lang == "en":
            day_label = "day" if overdue_days == 1 else "days"
            return f"overdue by {overdue_days} {day_label}"
        return f"po terminie od {overdue_days} dni"
    if lang == "en":
        day_label = "day" if days == 1 else "days"
        return f"expires in {days} {day_label}"
    return f"wygasa za {days} dni"


def _mandatory_digest_body(*, user: User, rows: list[MandatoryTrainingRecord]) -> str:
    """Plain-text fallback for email clients that do not render HTML tables."""

    lang = _lang(user)
    today = date.today()
    sorted_rows = sorted(rows, key=_mandatory_row_sort_key)

    if lang == "en":
        lines = [
            f"Hello {_safe_name(user)},",
            "",
            "This is your weekly Training Hub reminder about mandatory trainings that are expired or will expire within the next 30 days.",
            "",
            "Employee | Training | MPK | Expiration date | Status",
            "-" * 88,
        ]
        for row in sorted_rows:
            lines.append(
                " | ".join(
                    [
                        _mandatory_employee_label(row, lang),
                        row.training_name or "-",
                        row.cost_center_code or "-",
                        f"{row.expiration_date:%Y-%m-%d}",
                        _mandatory_status_label(row, today, lang),
                    ]
                )
            )
        lines.extend(["", "Open Training Hub to review the full list and current status."])
        return _join_lines(lines)

    lines = [
        f"Cześć {_safe_name(user)},",
        "",
        "To Twoje tygodniowe przypomnienie z Training Hub o szkoleniach obowiązkowych, które już wygasły albo wygasną w ciągu najbliższych 30 dni.",
        "",
        "Pracownik | Szkolenie | MPK | Data ważności | Status",
        "-" * 88,
    ]
    for row in sorted_rows:
        lines.append(
            " | ".join(
                [
                    _mandatory_employee_label(row, lang),
                    row.training_name or "-",
                    row.cost_center_code or "-",
                    f"{row.expiration_date:%Y-%m-%d}",
                    _mandatory_status_label(row, today, lang),
                ]
            )
        )
    lines.extend(["", "Otwórz Training Hub, aby sprawdzić pełną listę i aktualny status."])
    return _join_lines(lines)


def _mandatory_digest_html_body(*, user: User, rows: list[MandatoryTrainingRecord]) -> str:
    lang = _lang(user)
    today = date.today()
    sorted_rows = sorted(rows, key=_mandatory_row_sort_key)

    greeting = "Hello" if lang == "en" else "Cześć"
    intro = (
        "This is your weekly Training Hub reminder about mandatory trainings that are expired or will expire within the next 30 days."
        if lang == "en"
        else "To Twoje tygodniowe przypomnienie z Training Hub o szkoleniach obowiązkowych, które już wygasły albo wygasną w ciągu najbliższych 30 dni."
    )
    footer = (
        "Open Training Hub to review the full list and current status."
        if lang == "en"
        else "Otwórz Training Hub, aby sprawdzić pełną listę i aktualny status."
    )
    headers = (
        ["Employee", "Training", "MPK", "Expiration date", "Status"]
        if lang == "en"
        else ["Pracownik", "Szkolenie", "MPK", "Data ważności", "Status"]
    )

    header_html = "".join(
        f'<th align="left" style="border-bottom:1px solid #d9dce3;padding:10px 12px;background:#f3f4f7;font-size:12px;color:#343844;white-space:nowrap;">{escape(label)}</th>'
        for label in headers
    )

    row_html: list[str] = []
    for index, row in enumerate(sorted_rows):
        status_label = _mandatory_status_label(row, today, lang)
        is_overdue = (row.expiration_date - today).days < 0
        bg = "#ffffff" if index % 2 == 0 else "#fafbfc"
        status_color = "#b42318" if is_overdue else "#8a4b0f"
        cells = [
            _mandatory_employee_label(row, lang),
            row.training_name or "-",
            row.cost_center_code or "-",
            f"{row.expiration_date:%Y-%m-%d}",
            status_label,
        ]
        row_html.append(
            f'<tr style="background:{bg};">'
            + "".join(
                f'<td style="border-bottom:1px solid #eceef3;padding:9px 12px;vertical-align:top;color:{status_color if i == 4 else "#20232a"};font-size:13px;line-height:1.35;">{escape(str(value))}</td>'
                for i, value in enumerate(cells)
            )
            + "</tr>"
        )

    return f"""
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#20232a;">
    <div style="max-width:980px;margin:0 auto;padding:24px;">
      <div style="border:1px solid #e2e5ec;border-radius:16px;background:#ffffff;padding:20px;">
        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;">{escape(greeting)} {escape(_safe_name(user))},</p>
        <p style="margin:0 0 18px 0;font-size:14px;line-height:1.5;color:#4a5160;">{escape(intro)}</p>
        <div style="overflow-x:auto;">
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #dfe3eb;border-radius:12px;overflow:hidden;">
            <thead><tr>{header_html}</tr></thead>
            <tbody>{''.join(row_html)}</tbody>
          </table>
        </div>
        <p style="margin:18px 0 0 0;font-size:13px;line-height:1.5;color:#4a5160;">{escape(footer)}</p>
      </div>
    </div>
  </body>
</html>
""".strip()


def collect_weekly_mandatory_digest_rows(*, db: Session, user: User) -> list[MandatoryTrainingRecord]:
    today = date.today()
    stmt = (
        _visible_mandatory_training_stmt(db, user)
        .where(
            MandatoryTrainingRecord.expiration_date.is_not(None),
            MandatoryTrainingRecord.expiration_date <= today + timedelta(days=MANDATORY_DIGEST_LOOKAHEAD_DAYS),
        )
        .order_by(
            MandatoryTrainingRecord.expiration_date.asc(),
            MandatoryTrainingRecord.employee_name.asc(),
            MandatoryTrainingRecord.training_name.asc(),
        )
    )
    return list(db.scalars(stmt).all())


def send_weekly_mandatory_digest_if_due(*, db: Session, user: User) -> MailSendResult | None:
    if not user.is_active or user.is_pending_activation:
        return None
    if not getattr(user, "email_notifications_weekly_mandatory_digest", True):
        return None

    now = utcnow()
    last_sent = getattr(user, "last_weekly_mandatory_digest_sent_at", None)


    if last_sent is not None and _same_iso_week(last_sent.date(), now.date()):
        return None

    rows = collect_weekly_mandatory_digest_rows(db=db, user=user)
    if not rows:
        return None

    result = send_email_safe(
        db=db,
        to_email=user.email,
        subject=_mandatory_digest_subject(_lang(user)),
        body=_mandatory_digest_body(user=user, rows=rows),
        html_body=_mandatory_digest_html_body(user=user, rows=rows),
        kind="mandatory_training_weekly_digest",
    )
    if result.success:
        user.last_weekly_mandatory_digest_sent_at = now
        db.add(user)
        db.commit()
        db.refresh(user)
    return result