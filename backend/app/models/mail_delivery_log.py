from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow

if TYPE_CHECKING:
    from app.models.user import User


class MailDeliveryLog(Base):
    __tablename__ = "mail_delivery_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    kind: Mapped[str] = mapped_column(String(50), nullable=False, default="generic")
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    recipients: Mapped[str] = mapped_column(Text, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[User | None] = relationship("User", lazy="selectin")
