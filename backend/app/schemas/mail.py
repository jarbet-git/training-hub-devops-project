from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class MailStatusResponse(BaseModel):
    enabled: bool
    configured: bool
    host: str | None = None
    port: int | None = None
    use_tls: bool = False
    use_ssl: bool = False
    has_credentials: bool = False
    from_email: str | None = None
    from_name: str | None = None
    timeout_seconds: int = 10
    relay_mode: bool = False


class MailTestRequest(BaseModel):
    to_email: EmailStr
    subject: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, max_length=5000)


class MailTestResponse(BaseModel):
    success: bool
    message: str
    log_id: int | None = None


class MailDeliveryLogResponse(BaseModel):
    id: int
    created_at: datetime
    kind: str
    subject: str
    recipients: str
    success: bool
    provider: str | None = None
    error_message: str | None = None
    created_by_user_id: int | None = None
