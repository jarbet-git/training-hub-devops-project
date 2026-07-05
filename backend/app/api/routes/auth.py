from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.core.time import utcnow
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    ActivationTokenStatusResponse,
    CompleteActivationRequest,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordResetTokenStatusResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SimpleMessageResponse,
    TokenResponse,
)
from app.services.account_activation import (
    ActivationTokenExpiredError,
    ActivationTokenInvalidError,
    get_valid_activation_token,
    invalidate_user_activation_tokens,
)
from app.services.mail import send_email_safe

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _resolve_login_email(identifier: str) -> str:
    value = identifier.strip().lower()
    if value == "demo":
        return "demo@example.com"
    return value


def _frontend_base_url(request: Request | None = None) -> str:
    base = (settings.FRONTEND_URL or "").strip().rstrip("/")
    if base:
        return base
    if request is not None:
        origin = request.headers.get("origin")
        if origin:
            return origin.rstrip("/")
    return "http://localhost:5173"


def _build_reset_link(request: Request, raw_token: str) -> str:
    return f"{_frontend_base_url(request)}/reset-password?token={raw_token}"


def _generic_message(lang: str) -> str:
    return (
        "If an active account exists for this email address, a password reset link will be sent shortly."
        if lang == "en"
        else "Jeśli dla tego adresu email istnieje aktywne konto, link do resetu hasła zostanie wkrótce wysłany."
    )


def _reset_email_subject() -> str:
    return "Training Hub — reset hasła / password reset"


def _reset_email_body(*, user: User, link: str, expires_minutes: int) -> str:
    display_name = (user.full_name or user.email or "Użytkowniku / User").strip()
    return (
        f"Dzień dobry {display_name},\n\n"
        f"Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta Training Hub.\n"
        f"Użyj poniższego linku, aby ustawić nowe hasło:\n\n{link}\n\n"
        f"Link wygaśnie za {expires_minutes} minut. Jeżeli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość.\n\n"
        f"--- English ---\n\n"
        f"Hello {display_name},\n\n"
        f"We received a request to reset the password for your Training Hub account.\n"
        f"Use the link below to set a new password:\n\n{link}\n\n"
        f"This link will expire in {expires_minutes} minutes. If you did not request this change, you can ignore this email.\n\n"
        f"Training Hub"
    )


def _validate_reset_token(db: Session, raw_token: str) -> PasswordResetToken | None:
    token_hash = _hash_reset_token(raw_token)
    now = datetime.now(timezone.utc)
    return db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
    )


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public registration is disabled. Please contact HR/Admin to create an account.")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    login_email = _resolve_login_email(payload.email)
    user = db.scalar(select(User).where(User.email == login_email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    if getattr(user, "is_pending_activation", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account requires activation. Check your email or contact your administrator.",
        )
    return TokenResponse(access_token=create_access_token(str(user.id)), refresh_token=create_refresh_token(str(user.id)))


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_payload = decode_token(payload.refresh_token)
        if token_payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        sub = token_payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.get(User, int(sub))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    if getattr(user, "is_pending_activation", False):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User requires activation")
    return TokenResponse(access_token=create_access_token(str(user.id)), refresh_token=create_refresh_token(str(user.id)))


@router.post("/forgot-password", response_model=SimpleMessageResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    lang = ((getattr(user, "preferred_language", None) or "pl").strip().lower() if user else "pl")
    generic = _generic_message(lang)
    if not user or not user.is_active or getattr(user, "is_pending_activation", False):
        return SimpleMessageResponse(message=generic)

    now = datetime.now(timezone.utc)
    db.execute(update(PasswordResetToken).where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)).values(used_at=now))
    raw_token = secrets.token_urlsafe(48)
    expires_minutes = max(int(settings.RESET_PASSWORD_EXPIRE_MINUTES or 60), 5)
    row = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_reset_token(raw_token),
        expires_at=now + timedelta(minutes=expires_minutes),
        request_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(row)
    db.commit()
    send_email_safe(
        db,
        to_email=user.email,
        subject=_reset_email_subject(),
        body=_reset_email_body(user=user, link=_build_reset_link(request, raw_token), expires_minutes=expires_minutes),
        kind="password_reset",
        created_by_user_id=user.id,
    )
    return SimpleMessageResponse(message=generic)


@router.get("/reset-password/validate", response_model=PasswordResetTokenStatusResponse)
def validate_reset_password_token(token: str, db: Session = Depends(get_db)):
    row = _validate_reset_token(db, token)
    return PasswordResetTokenStatusResponse(valid=bool(row), message=None if row else "Invalid or expired token")


@router.post("/reset-password", response_model=SimpleMessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = _validate_reset_token(db, payload.token)
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    user = db.get(User, row.user_id)
    if not user or not user.is_active or getattr(user, "is_pending_activation", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from current password")
    now = datetime.now(timezone.utc)
    user.password_hash = hash_password(payload.new_password)
    row.used_at = now
    db.add(user)
    db.add(row)
    db.execute(update(PasswordResetToken).where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None), PasswordResetToken.id != row.id).values(used_at=now))
    db.commit()
    return SimpleMessageResponse(message="Password has been reset")


@router.get("/activate-account/validate", response_model=ActivationTokenStatusResponse)
def validate_activation_token(token: str, db: Session = Depends(get_db)):
    try:
        row = get_valid_activation_token(db, token)
        user = db.get(User, row.user_id)
        if not user:
            raise ActivationTokenInvalidError("Invalid activation token")
        return ActivationTokenStatusResponse(
            valid=True,
            email=user.email,
            full_name=user.full_name,
            expires_at=row.expires_at.isoformat(),
            message=None,
        )
    except ActivationTokenExpiredError:
        return ActivationTokenStatusResponse(valid=False, message="Activation token has expired")
    except ActivationTokenInvalidError:
        return ActivationTokenStatusResponse(valid=False, message="Invalid activation token")


@router.post("/activate-account", response_model=SimpleMessageResponse)
def activate_account(payload: CompleteActivationRequest, db: Session = Depends(get_db)):
    try:
        row = get_valid_activation_token(db, payload.token)
    except ActivationTokenExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except ActivationTokenInvalidError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid activation token")

    now = utcnow()
    user.password_hash = hash_password(payload.password)
    user.is_pending_activation = False
    user.activated_at = now
    row.used_at = now

    db.add(user)
    db.add(row)
    db.flush()
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    invalidate_user_activation_tokens(db, user.id)
    db.commit()
    return SimpleMessageResponse(message="Account activated")
