from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MailSendResult:
    sent: bool
    error: str | None = None


def send_email(*, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> MailSendResult:
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        return MailSendResult(sent=False, error="SMTP is not configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL)) if settings.SMTP_FROM_NAME else settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
                if settings.SMTP_USERNAME:
                    smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
                smtp.ehlo()
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                    smtp.ehlo()
                if settings.SMTP_USERNAME:
                    smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        return MailSendResult(sent=True)
    except Exception as exc:  # pragma: no cover
        logger.exception("Failed to send email to %s", to_email)
        return MailSendResult(sent=False, error=str(exc))
