from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, MessageResponse, UserPreferencesUpdateRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

ALLOWED_AVATAR_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
ALLOWED_AVATAR_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _avatar_url(request: Request, current: User) -> str | None:
    if not current.avatar_path:
        return None
    base = str(request.base_url).rstrip('/')
    return f"{base}{settings.MEDIA_URL.rstrip('/')}/{current.avatar_path.lstrip('/')}"


@router.get("/me", response_model=UserResponse)
def me(request: Request, current: User = Depends(get_current_user)):
    return UserResponse(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        role=current.role,
        is_active=current.is_active,
        preferred_language=(current.preferred_language or "pl"),
        preferred_theme=(current.preferred_theme or "system"),
        avatar_url=_avatar_url(request, current),
        email_notifications_hr_response=bool(getattr(current, "email_notifications_hr_response", True)),
        email_notifications_proposal_review=bool(getattr(current, "email_notifications_proposal_review", True)),
        email_notifications_weekly_mandatory_digest=bool(getattr(current, "email_notifications_weekly_mandatory_digest", True)),
    )


@router.patch("/me/preferences", response_model=UserResponse)
def update_me_preferences(
    payload: UserPreferencesUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if payload.preferred_language is not None:
        current.preferred_language = payload.preferred_language
    if payload.preferred_theme is not None:
        current.preferred_theme = payload.preferred_theme
    if payload.email_notifications_hr_response is not None:
        current.email_notifications_hr_response = payload.email_notifications_hr_response
    if payload.email_notifications_proposal_review is not None:
        current.email_notifications_proposal_review = payload.email_notifications_proposal_review
    if payload.email_notifications_weekly_mandatory_digest is not None:
        current.email_notifications_weekly_mandatory_digest = payload.email_notifications_weekly_mandatory_digest
    db.add(current)
    db.commit()
    db.refresh(current)
    return UserResponse(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        role=current.role,
        is_active=current.is_active,
        preferred_language=current.preferred_language,
        preferred_theme=current.preferred_theme,
        avatar_url=_avatar_url(request, current),
        email_notifications_hr_response=bool(getattr(current, "email_notifications_hr_response", True)),
        email_notifications_proposal_review=bool(getattr(current, "email_notifications_proposal_review", True)),
        email_notifications_weekly_mandatory_digest=bool(getattr(current, "email_notifications_weekly_mandatory_digest", True)),
    )


@router.post("/me/change-password", response_model=MessageResponse)
def change_my_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from current password")

    current.password_hash = hash_password(payload.new_password)
    db.add(current)
    db.commit()
    return MessageResponse(message="Password updated")


@router.post("/me/avatar", response_model=UserResponse)
def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    filename = (file.filename or "avatar").strip()
    suffix = Path(filename).suffix.lower()
    if file.content_type not in ALLOWED_AVATAR_CONTENT_TYPES or suffix not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PNG, JPG and WEBP avatars are supported")

    raw = file.file.read()
    max_bytes = max(int(settings.MAX_AVATAR_SIZE_MB or 2), 1) * 1024 * 1024
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(raw) > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Avatar must be smaller than {settings.MAX_AVATAR_SIZE_MB} MB")

    avatars_root = Path(settings.MEDIA_ROOT) / "avatars"
    avatars_root.mkdir(parents=True, exist_ok=True)
    safe_name = f"user_{current.id}_{secrets.token_hex(8)}{suffix}"
    full_path = avatars_root / safe_name
    full_path.write_bytes(raw)

    old_path = current.avatar_path
    current.avatar_path = f"avatars/{safe_name}"
    db.add(current)
    db.commit()
    db.refresh(current)

    if old_path:
        old_full = Path(settings.MEDIA_ROOT) / old_path
        if old_full.exists():
            try:
                old_full.unlink()
            except OSError:
                pass

    return UserResponse(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        role=current.role,
        is_active=current.is_active,
        preferred_language=current.preferred_language,
        preferred_theme=current.preferred_theme,
        avatar_url=_avatar_url(request, current),
        email_notifications_hr_response=bool(getattr(current, "email_notifications_hr_response", True)),
        email_notifications_proposal_review=bool(getattr(current, "email_notifications_proposal_review", True)),
        email_notifications_weekly_mandatory_digest=bool(getattr(current, "email_notifications_weekly_mandatory_digest", True)),
    )


@router.delete("/me/avatar", response_model=UserResponse)
def delete_my_avatar(
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    old_path = current.avatar_path
    current.avatar_path = None
    db.add(current)
    db.commit()
    db.refresh(current)

    if old_path:
        old_full = Path(settings.MEDIA_ROOT) / old_path
        if old_full.exists():
            try:
                old_full.unlink()
            except OSError:
                pass

    return UserResponse(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        role=current.role,
        is_active=current.is_active,
        preferred_language=current.preferred_language,
        preferred_theme=current.preferred_theme,
        avatar_url=None,
        email_notifications_hr_response=bool(getattr(current, "email_notifications_hr_response", True)),
        email_notifications_proposal_review=bool(getattr(current, "email_notifications_proposal_review", True)),
        email_notifications_weekly_mandatory_digest=bool(getattr(current, "email_notifications_weekly_mandatory_digest", True)),
    )
