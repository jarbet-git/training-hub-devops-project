from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    preferred_language: str = "pl"
    preferred_theme: str = "system"
    avatar_url: str | None = None
    email_notifications_hr_response: bool = True
    email_notifications_proposal_review: bool = True
    email_notifications_weekly_mandatory_digest: bool = True


class UserPreferencesUpdateRequest(BaseModel):
    preferred_language: str | None = Field(default=None, pattern="^(pl|en)$")
    preferred_theme: str | None = Field(default=None, pattern="^(light|dark|system)$")
    email_notifications_hr_response: bool | None = None
    email_notifications_proposal_review: bool | None = None
    email_notifications_weekly_mandatory_digest: bool | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


class MessageResponse(BaseModel):
    message: str
