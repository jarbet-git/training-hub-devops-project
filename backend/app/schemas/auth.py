from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    # Accept either a full email address or a short demo login alias.
    email: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=5000)
    new_password: str = Field(min_length=6, max_length=128)


class CompleteActivationRequest(BaseModel):
    token: str = Field(min_length=20, max_length=5000)
    password: str = Field(min_length=8, max_length=128)


class SimpleMessageResponse(BaseModel):
    message: str


class PasswordResetTokenStatusResponse(BaseModel):
    valid: bool
    message: str | None = None


class ActivationTokenStatusResponse(BaseModel):
    valid: bool
    email: EmailStr | None = None
    full_name: str | None = None
    expires_at: str | None = None
    message: str | None = None
