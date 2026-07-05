from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.mail_delivery_log import MailDeliveryLog
from app.models.user import User
from app.schemas.mail import (
    MailDeliveryLogResponse,
    MailStatusResponse,
    MailTestRequest,
    MailTestResponse,
)
from app.services.mail import get_mail_status, send_email_safe

router = APIRouter(prefix="/admin/mail", tags=["admin-mail"])


def _require_admin_mail(user: User) -> None:
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


@router.get("/status", response_model=MailStatusResponse)
def mail_status(user: User = Depends(get_current_user)):
    _require_admin_mail(user)
    return MailStatusResponse(**get_mail_status())


@router.post("/test", response_model=MailTestResponse)
def send_test_mail(
    payload: MailTestRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_mail(user)
    result = send_email_safe(
        db,
        to_emails=[payload.to_email],
        subject=payload.subject or "Training Hub · test konfiguracji poczty",
        body=payload.body or "To jest testowa wiadomość z aplikacji Training Hub.",
        kind="test",
        created_by_user_id=user.id,
    )
    return MailTestResponse(success=result.success, message=result.message, log_id=result.log_id)


@router.get("/logs", response_model=list[MailDeliveryLogResponse])
def list_mail_logs(
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_mail(user)
    rows = db.scalars(select(MailDeliveryLog).order_by(MailDeliveryLog.created_at.desc(), MailDeliveryLog.id.desc()).limit(limit)).all()
    return [
        MailDeliveryLogResponse(
            id=x.id,
            created_at=x.created_at,
            kind=x.kind,
            subject=x.subject,
            recipients=x.recipients,
            success=x.success,
            provider=x.provider,
            error_message=x.error_message,
            created_by_user_id=x.created_by_user_id,
        )
        for x in rows
    ]
