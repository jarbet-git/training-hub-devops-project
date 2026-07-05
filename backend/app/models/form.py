from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow
from app.models.enums import FormStatus

if TYPE_CHECKING:
    from app.models.form_event import FormEvent
    from app.models.form_item import FormItem
    from app.models.collection_window import CollectionWindow
    from app.models.user import User


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)

    # ✅ wymagane przez DB
    collection_window_id: Mapped[int] = mapped_column(
        ForeignKey("collection_windows.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), index=True, nullable=False)

    # legacy (może zostać nullable, ale docelowo MPK będzie w itemach)
    cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id"), index=True, nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    status: Mapped[str] = mapped_column(
        String(30),
        default=FormStatus.DRAFT.value,
        index=True,
        nullable=False,
    )

    last_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_commented_by_role: Mapped[str | None] = mapped_column(String(30), nullable=True)
    last_commented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- HR response (per whole request) ---
    hr_budget_total: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    hr_decision: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hr_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

    collection_window: Mapped["CollectionWindow"] = relationship()
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by_user_id])

    items: Mapped[list["FormItem"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
    )

    events: Mapped[list["FormEvent"]] = relationship(
        "FormEvent",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="FormEvent.id",
    )
