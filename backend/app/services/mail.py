from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Iterable

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.mail_delivery_log import MailDeliveryLog


class MailSendResult:
    def __init__(self, *, success: bool, message: str, log_id: int | None = None):
        self.success = success
        self.message = message
        self.log_id = log_id


def get_mail_status() -> dict:
    configured = bool(settings.MAIL_HOST and settings.MAIL_FROM_EMAIL)
    has_credentials = bool(settings.MAIL_USERNAME and settings.MAIL_PASSWORD)
    return {
        "enabled": bool(settings.MAIL_ENABLED),
        "configured": configured,
        "host": settings.MAIL_HOST,
        "port": settings.MAIL_PORT,
        "use_tls": bool(settings.MAIL_USE_TLS),
        "use_ssl": bool(settings.MAIL_USE_SSL),
        "has_credentials": has_credentials,
        "from_email": settings.MAIL_FROM_EMAIL,
        "from_name": settings.MAIL_FROM_NAME,
        "timeout_seconds": settings.MAIL_TIMEOUT_SECONDS,
        "relay_mode": configured and not has_credentials,
    }


def _build_message(*, to_emails: Iterable[str], subject: str, body: str, html_body: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    sender = settings.MAIL_FROM_EMAIL or "no-reply@example.invalid"
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{sender}>" if settings.MAIL_FROM_NAME else sender
    msg["To"] = ", ".join([x.strip() for x in to_emails if x and x.strip()])
    msg["Subject"] = subject
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")
    return msg


def _deliver_message(msg: EmailMessage) -> None:
    if settings.MAIL_USE_SSL:
        with smtplib.SMTP_SSL(settings.MAIL_HOST, settings.MAIL_PORT, timeout=settings.MAIL_TIMEOUT_SECONDS) as smtp:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            smtp.send_message(msg)
        return

    with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT, timeout=settings.MAIL_TIMEOUT_SECONDS) as smtp:
        smtp.ehlo()
        if settings.MAIL_USE_TLS:
            smtp.starttls()
            smtp.ehlo()
        if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
            smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        smtp.send_message(msg)


def _log_result(db: Session | None, *, recipients: list[str], subject: str, success: bool, provider: str = "smtp", error_message: str | None = None, kind: str = "generic", created_by_user_id: int | None = None) -> int | None:
    if db is None:
        return None
    try:
        log = MailDeliveryLog(
            created_by_user_id=created_by_user_id,
            kind=kind,
            subject=subject,
            recipients=", ".join(recipients),
            success=success,
            provider=provider,
            error_message=error_message,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log.id
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return None


def send_email_safe(
    db: Session | None = None,
    *,
    to_emails: list[str] | None = None,
    to_email: str | None = None,
    subject: str,
    body: str,
    html_body: str | None = None,
    kind: str = "generic",
    created_by_user_id: int | None = None,
):
    recipients = [x for x in (to_emails or []) if x]
    if to_email:
        recipients.append(to_email)
    recipients = [x.strip() for x in recipients if x and x.strip()]

    status = get_mail_status()
    if not recipients:
        result = MailSendResult(success=False, message="No recipients provided.", log_id=None)
        _log_result(db, recipients=recipients, subject=subject, success=False, error_message=result.message, kind=kind, created_by_user_id=created_by_user_id)
        return result if db is not None or to_emails is not None else False

    if not status["enabled"]:
        log_id = _log_result(db, recipients=recipients, subject=subject, success=False, error_message="Mail sending is disabled in configuration.", kind=kind, created_by_user_id=created_by_user_id)
        result = MailSendResult(success=False, message="Mail sending is disabled.", log_id=log_id)
        return result if db is not None or to_emails is not None else False

    if not status["configured"]:
        log_id = _log_result(db, recipients=recipients, subject=subject, success=False, error_message="Mail configuration is incomplete.", kind=kind, created_by_user_id=created_by_user_id)
        result = MailSendResult(success=False, message="Mail configuration is incomplete.", log_id=log_id)
        return result if db is not None or to_emails is not None else False

    try:
        msg = _build_message(to_emails=recipients, subject=subject, body=body, html_body=html_body)
        _deliver_message(msg)
        log_id = _log_result(db, recipients=recipients, subject=subject, success=True, error_message=None, kind=kind, created_by_user_id=created_by_user_id)
        result = MailSendResult(success=True, message="Mail sent successfully.", log_id=log_id)
        return result if db is not None or to_emails is not None else True
    except Exception as exc:
        log_id = _log_result(db, recipients=recipients, subject=subject, success=False, error_message=str(exc), kind=kind, created_by_user_id=created_by_user_id)
        result = MailSendResult(success=False, message=str(exc), log_id=log_id)
        return result if db is not None or to_emails is not None else False
