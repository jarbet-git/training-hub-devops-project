from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.time import utcnow


class NotificationReadWatermark(Base):
    __tablename__ = "notification_read_watermarks"
    __table_args__ = (
        UniqueConstraint("user_id", "scope", name="uq_notification_read_watermarks_user_scope"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
