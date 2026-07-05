from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

ALLOWED_ROLES = {"EDITOR", "MANAGER", "HR", "ADMIN"}


def _normalize_role(v: str) -> str:
    v = (v or "").strip().upper()
    if v not in ALLOWED_ROLES:
        raise ValueError(f"Invalid role. Allowed: {sorted(ALLOWED_ROLES)}")
    return v


class UserAdminResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    role: str
    is_active: bool
    is_pending_activation: bool = False
    activated_at: datetime | None = None
    area_ids: list[int] = Field(default_factory=list)

    @field_validator("role")
    @classmethod
    def _v_role(cls, v: str) -> str:
        return _normalize_role(v)


class UserAdminCreateRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: str = "EDITOR"
    is_active: bool = True
    area_ids: list[int] = Field(default_factory=list)

    @field_validator("role")
    @classmethod
    def _v_role(cls, v: str) -> str:
        return _normalize_role(v)


class UserAdminUpdateRequest(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    area_ids: list[int] | None = None

    @field_validator("role")
    @classmethod
    def _v_role(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return _normalize_role(v)


class SetUserAreasRequest(BaseModel):
    area_ids: list[int] = Field(default_factory=list)


class UserActivationLinkResponse(BaseModel):
    activation_link: str
    expires_at: datetime


class UserInviteActionResponse(BaseModel):
    message: str
    email_sent: bool
    user: UserAdminResponse
    activation_link: str | None = None
    expires_at: datetime | None = None
