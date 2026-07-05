from datetime import datetime


from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, Table, Column, Integer, UniqueConstraint, DateTime

from app.core.database import Base


# Many-to-many: user can have access to multiple areas (granted by HR/ADMIN).
user_area_access = Table(
    "user_area_access",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("area_id", Integer, ForeignKey("areas.id", ondelete="CASCADE"), nullable=False),
    UniqueConstraint("user_id", "area_id", name="uq_user_area_access"),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(500), nullable=False)

    # ADMIN / HR / MANAGER / EDITOR
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="EDITOR")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_pending_activation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    preferred_language: Mapped[str] = mapped_column(String(2), nullable=False, default="pl")
    preferred_theme: Mapped[str] = mapped_column(String(10), nullable=False, default="system")
    avatar_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    email_notifications_hr_response: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_notifications_proposal_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_notifications_weekly_mandatory_digest: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_weekly_mandatory_digest_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # (legacy/MVP) pojedyncze area — zostawiamy dla kompatybilności
    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"), index=True, nullable=True)

    area = relationship("Area", foreign_keys=[area_id], lazy="selectin")

    # docelowo: wiele area
    areas = relationship(
        "Area",
        secondary=user_area_access,
        lazy="selectin",
    )
