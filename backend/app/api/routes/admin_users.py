from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models.area import Area
from app.models.user import User, user_area_access
from app.schemas.admin_users import (
    SetUserAreasRequest,
    UserActivationLinkResponse,
    UserAdminCreateRequest,
    UserAdminResponse,
    UserAdminUpdateRequest,
    UserInviteActionResponse,
)
from app.services.account_activation import create_activation_invite

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


def _role(user: User) -> str:
    return (getattr(user, "role", None) or "").upper()


def require_hr_admin(user: User) -> None:
    if _role(user) not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def require_admin(user: User) -> None:
    if _role(user) != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only ADMIN")


def _ensure_admin_only(current_user: User, requested_role: str | None) -> None:
    if requested_role is None:
        return
    if requested_role.upper() == "ADMIN" and _role(current_user) != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only ADMIN can assign ADMIN role")


def _ensure_can_edit_target(current_user: User, target: User) -> None:
    if _role(target) == "ADMIN" and _role(current_user) != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only ADMIN can manage ADMIN users")


def _user_to_response(u: User) -> UserAdminResponse:
    area_ids = [int(a.id) for a in (getattr(u, "areas", None) or []) if getattr(a, "id", None) is not None]
    return UserAdminResponse(
        id=u.id,
        email=u.email,
        full_name=getattr(u, "full_name", None),
        role=_role(u),
        is_active=bool(getattr(u, "is_active", True)),
        is_pending_activation=bool(getattr(u, "is_pending_activation", False)),
        activated_at=getattr(u, "activated_at", None),
        area_ids=sorted(set(area_ids)),
    )


def _validate_areas(db: Session, area_ids: list[int]) -> list[int]:
    uniq = sorted(set(int(x) for x in area_ids if x is not None))
    if not uniq:
        return []
    existing = set(db.scalars(select(Area.id).where(Area.id.in_(uniq))).all())
    missing = [x for x in uniq if x not in existing]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown area_id(s): {missing}",
        )
    return uniq


def _set_user_areas(db: Session, user_id: int, area_ids: list[int]) -> None:
    area_ids = _validate_areas(db, area_ids)
    db.execute(delete(user_area_access).where(user_area_access.c.user_id == user_id))
    if area_ids:
        rows = [{"user_id": user_id, "area_id": aid} for aid in area_ids]
        db.execute(user_area_access.insert(), rows)


def _role_requires_area(role: str | None) -> bool:
    return (role or "").strip().upper() not in {"ADMIN", "HR"}


def _ensure_role_area_assignment(role: str | None, area_ids: list[int] | None) -> None:
    if _role_requires_area(role) and not list(area_ids or []):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one area is required for this role",
        )


def _load_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id, options=[selectinload(User.areas)])


@router.get("", response_model=list[UserAdminResponse])
def list_users(
    q: str | None = Query(default=None, description="Search by email/full_name"),
    role: str | None = Query(default=None),
    area_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)

    stmt = select(User).options(selectinload(User.areas))

    if q:
        qq = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            func.lower(User.email).like(qq)
            | func.lower(func.coalesce(User.full_name, "")).like(qq)
        )

    if role:
        stmt = stmt.where(func.upper(User.role) == role.strip().upper())

    if area_id is not None:
        stmt = stmt.join(user_area_access, user_area_access.c.user_id == User.id).where(user_area_access.c.area_id == area_id)

    rows = db.scalars(stmt.order_by(User.id.asc())).all()
    return [_user_to_response(u) for u in rows]


@router.post("", response_model=UserAdminResponse, status_code=201)
def create_user(
    payload: UserAdminCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)
    _ensure_admin_only(current_user, payload.role)

    email = payload.email.strip().lower()
    exists = db.scalar(select(func.count()).select_from(User).where(func.lower(User.email) == email))
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    normalized_role = payload.role.upper()
    _ensure_role_area_assignment(normalized_role, payload.area_ids)

    user = User(
        email=email,
        full_name=(payload.full_name or "").strip(),
        role=normalized_role,
        is_active=payload.is_active,
        is_pending_activation=True,
        activated_at=None,
        password_hash=hash_password(secrets.token_urlsafe(48)),
    )
    db.add(user)
    db.flush()

    _set_user_areas(db, user.id, payload.area_ids)
    create_activation_invite(db, user=user, created_by_user_id=current_user.id, send_mail=True)

    db.commit()

    user = _load_user(db, user.id)
    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserAdminResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)

    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_can_edit_target(current_user, user)
    return _user_to_response(user)


@router.patch("/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: int,
    payload: UserAdminUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)

    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_can_edit_target(current_user, user)
    _ensure_admin_only(current_user, payload.role)

    if payload.email and payload.email.lower() != user.email.lower():
        new_email = payload.email.strip().lower()
        exists = db.scalar(select(func.count()).select_from(User).where(func.lower(User.email) == new_email))
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")
        user.email = new_email

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()

    next_role = payload.role.upper() if payload.role is not None else _role(user)
    next_area_ids = payload.area_ids if payload.area_ids is not None else [int(a.id) for a in (user.areas or []) if getattr(a, "id", None) is not None]
    _ensure_role_area_assignment(next_role, next_area_ids)

    if payload.role is not None:
        user.role = next_role

    if payload.is_active is not None:
        require_admin(current_user)
        if user.id == current_user.id and payload.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
        user.is_active = payload.is_active

    if payload.area_ids is not None:
        _set_user_areas(db, user.id, payload.area_ids)

    db.add(user)
    db.commit()

    user = _load_user(db, user.id)
    return _user_to_response(user)


@router.put("/{user_id}/areas", response_model=UserAdminResponse)
def set_user_areas(
    user_id: int,
    payload: SetUserAreasRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)

    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_can_edit_target(current_user, user)
    _ensure_role_area_assignment(_role(user), payload.area_ids)
    _set_user_areas(db, user.id, payload.area_ids)

    db.commit()

    user = _load_user(db, user.id)
    return _user_to_response(user)


@router.post("/{user_id}/resend-invite", response_model=UserInviteActionResponse)
def resend_invite(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)

    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_can_edit_target(current_user, user)

    user.is_pending_activation = True
    user.activated_at = None
    invite = create_activation_invite(db, user=user, created_by_user_id=current_user.id, send_mail=True)
    db.add(user)
    db.commit()

    user = _load_user(db, user.id)
    email_sent = bool(invite.email_result and invite.email_result.success)
    return UserInviteActionResponse(
        message="Activation invite sent" if email_sent else "Activation link regenerated but email was not sent",
        email_sent=email_sent,
        user=_user_to_response(user),
        activation_link=None,
        expires_at=invite.expires_at,
    )


@router.post("/{user_id}/activation-link", response_model=UserActivationLinkResponse)
def generate_activation_link(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_hr_admin(current_user)

    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_can_edit_target(current_user, user)

    user.is_pending_activation = True
    user.activated_at = None
    invite = create_activation_invite(db, user=user, created_by_user_id=current_user.id, send_mail=False)
    db.add(user)
    db.commit()

    return UserActivationLinkResponse(activation_link=invite.activation_link, expires_at=invite.expires_at)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Hard delete is disabled. Deactivate instead.",
    )
