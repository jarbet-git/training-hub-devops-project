from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.mailer import send_email
from app.core.security import hash_password
from app.models.user import User


@dataclass
class InviteEmailResult:
    sent: bool
    error: str | None = None


@dataclass
class ActivationLinkResult:
    token: str
    link: str
    expires_at: datetime


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _build_activation_link(token: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/activate-account?token={quote(token)}"


def prepare_activation(user: User) -> ActivationLinkResult:
    token = secrets.token_urlsafe(32)
    expires_at = _now_utc() + timedelta(hours=max(settings.INVITE_TTL_HOURS, 1))

    user.invite_pending = True
    user.invite_token_hash = _hash_token(token)
    user.invite_expires_at = expires_at
    user.invite_sent_at = _now_utc()

    return ActivationLinkResult(token=token, link=_build_activation_link(token), expires_at=expires_at)


def create_invited_user(*, email: str, full_name: str, role: str, is_active: bool) -> User:
    return User(
        email=email,
        full_name=full_name,
        role=role,
        is_active=is_active,
        password_hash=hash_password(secrets.token_urlsafe(24)),
        invite_pending=True,
    )


def send_activation_email(*, user: User, activation_link: str, expires_at: datetime) -> InviteEmailResult:
    subject = "Training Hub — ustaw hasło do konta"
    text_body = (
        f"Cześć {user.full_name or user.email}\n\n"
        "Twoje konto w systemie Training Hub zostało utworzone.\n"
        f"Aby ustawić hasło i aktywować dostęp, otwórz link:\n{activation_link}\n\n"
        f"Link jest ważny do: {expires_at.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n\n"
        "Jeśli link wygaśnie, skontaktuj się z administratorem."
    )
    html_body = f"""
    <p>Cześć {user.full_name or user.email},</p>
    <p>Twoje konto w systemie <strong>Training Hub</strong> zostało utworzone.</p>
    <p>
      Aby ustawić hasło i aktywować dostęp, kliknij poniższy link:<br />
      <a href=\"{activation_link}\">Ustaw hasło</a>
    </p>
    <p>Link jest ważny do: <strong>{expires_at.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</strong>.</p>
    <p>Jeśli link wygaśnie, skontaktuj się z administratorem.</p>
    """
    try:
        send_email(to_email=user.email, subject=subject, text_body=text_body, html_body=html_body)
        return InviteEmailResult(sent=True)
    except Exception as exc:
        return InviteEmailResult(sent=False, error=str(exc))


def issue_activation_link(db: Session, user: User) -> ActivationLinkResult:
    result = prepare_activation(user)
    db.add(user)
    db.flush()
    return result


def send_or_regenerate_invite(db: Session, user: User) -> tuple[ActivationLinkResult, InviteEmailResult]:
    link_result = issue_activation_link(db, user)
    email_result = send_activation_email(user=user, activation_link=link_result.link, expires_at=link_result.expires_at)
    db.add(user)
    db.flush()
    return link_result, email_result


def get_user_for_activation_token(db: Session, token: str) -> User | None:
    token_hash = _hash_token(token)
    user = db.scalar(select(User).where(User.invite_token_hash == token_hash))
    if not user or not user.invite_pending:
        return None
    if not user.invite_expires_at or user.invite_expires_at < _now_utc():
        return None
    return user


def activate_user_password(db: Session, *, token: str, password: str) -> User | None:
    user = get_user_for_activation_token(db, token)
    if not user:
        return None

    user.password_hash = hash_password(password)
    user.invite_pending = False
    user.invite_accepted_at = _now_utc()
    user.invite_token_hash = None
    user.invite_expires_at = None
    db.add(user)
    db.flush()
    return user
