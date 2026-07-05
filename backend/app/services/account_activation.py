from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import quote

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.time import utcnow
from app.models.account_activation_token import AccountActivationToken
from app.models.user import User
from app.services.mail import MailSendResult, send_email_safe


@dataclass
class GeneratedActivationInvite:
    activation_link: str
    expires_at: datetime
    email_result: MailSendResult | None = None


class ActivationTokenError(Exception):
    pass


class ActivationTokenExpiredError(ActivationTokenError):
    pass


class ActivationTokenInvalidError(ActivationTokenError):
    pass


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _frontend_base_url() -> str:
    return (settings.FRONTEND_URL or "http://localhost:5173").strip().rstrip("/")


def _build_activation_link(token: str) -> str:
    return f"{_frontend_base_url()}/activate-account?token={quote(token)}"


def invalidate_user_activation_tokens(db: Session, user_id: int) -> None:
    db.execute(delete(AccountActivationToken).where(AccountActivationToken.user_id == user_id))


def _greeting(full_name: str | None) -> str:
    if full_name and full_name.strip():
        return full_name.strip()
    return "Użytkowniku / User"


def _activation_email_subject() -> str:
    return "Training Hub — aktywacja konta / account activation"


def _activation_email_body(*, full_name: str | None, activation_link: str, expires_at_hours: int) -> str:
    greet = _greeting(full_name)
    return f"""Dzień dobry {greet},

Twoje konto w systemie Training Hub zostało utworzone.
Aby ustawić pierwsze hasło i aktywować konto, otwórz poniższy link:

{activation_link}

Link jest jednorazowy i ważny przez {expires_at_hours} godziny.
Jeżeli link wygaśnie albo wiadomość nie dotrze poprawnie, skontaktuj się z administratorem lub HR.

--- English ---

Hello {greet},

Your Training Hub account has been created.
To set your first password and activate the account, open the link below:

{activation_link}

This link can be used only once and will expire in {expires_at_hours} hours.
If the link expires or the message does not arrive correctly, please contact your administrator or HR.
"""


def send_activation_invite_email(
    db: Session,
    *,
    to_email: str,
    full_name: str | None,
    activation_link: str,
    expires_at_hours: int,
    created_by_user_id: int | None,
) -> MailSendResult:
    return send_email_safe(
        db,
        to_email=to_email,
        subject=_activation_email_subject(),
        body=_activation_email_body(full_name=full_name, activation_link=activation_link, expires_at_hours=expires_at_hours),
        kind="account_activation",
        created_by_user_id=created_by_user_id,
    )


def create_activation_invite(
    db: Session,
    *,
    user: User,
    created_by_user_id: int | None,
    send_mail: bool,
) -> GeneratedActivationInvite:
    invalidate_user_activation_tokens(db, user.id)

    raw_token = secrets.token_urlsafe(32)
    expires_at = utcnow() + timedelta(hours=max(int(settings.ACCOUNT_ACTIVATION_TOKEN_TTL_HOURS or 24), 1))
    row = AccountActivationToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
        used_at=None,
        created_at=utcnow(),
        created_by_user_id=created_by_user_id,
    )
    db.add(row)
    db.flush()

    activation_link = _build_activation_link(raw_token)
    email_result: MailSendResult | None = None
    if send_mail:
        email_result = send_activation_invite_email(
            db,
            to_email=user.email,
            full_name=user.full_name,
            activation_link=activation_link,
            expires_at_hours=max(int(settings.ACCOUNT_ACTIVATION_TOKEN_TTL_HOURS or 24), 1),
            created_by_user_id=created_by_user_id,
        )

    return GeneratedActivationInvite(
        activation_link=activation_link,
        expires_at=expires_at,
        email_result=email_result,
    )


def get_valid_activation_token(db: Session, raw_token: str) -> AccountActivationToken:
    token_hash = _hash_token(raw_token)
    row = db.scalar(select(AccountActivationToken).where(AccountActivationToken.token_hash == token_hash))
    if not row:
        raise ActivationTokenInvalidError("Invalid activation token")
    if row.used_at is not None:
        raise ActivationTokenInvalidError("Activation token has already been used")
    if row.expires_at <= utcnow():
        raise ActivationTokenExpiredError("Activation token has expired")
    return row
