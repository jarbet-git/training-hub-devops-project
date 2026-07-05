from __future__ import annotations

import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings


class MailerConfigError(RuntimeError):
    pass


class MailerSendError(RuntimeError):
    pass


def _ensure_configured() -> None:
    if not settings.SMTP_HOST:
        raise MailerConfigError("SMTP_HOST is not configured")
    if not settings.SMTP_FROM_EMAIL:
        raise MailerConfigError("SMTP_FROM_EMAIL is not configured")


def send_email(*, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    _ensure_configured()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    message["To"] = to_email
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        if settings.SMTP_USE_SSL:
            server: smtplib.SMTP | smtplib.SMTP_SSL = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)

        with server:
            if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
            server.send_message(message)
    except MailerConfigError:
        raise
    except Exception as exc:
        raise MailerSendError(str(exc)) from exc
