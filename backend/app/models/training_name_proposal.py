from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow


class TrainingNameProposal(Base):
    __tablename__ = "training_name_proposals"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(200), nullable=True)
    justification: Mapped[str] = mapped_column(Text, nullable=False)

    suggested_category_id: Mapped[int | None] = mapped_column(ForeignKey("training_categories.id"), index=True, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(200), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estimated_cost_per_person: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    estimated_hours_per_person: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True, default="SUBMITTED")

    requester_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    requester_role: Mapped[str] = mapped_column(String(30), nullable=False)

    form_id: Mapped[int | None] = mapped_column(ForeignKey("forms.id"), index=True, nullable=True)

    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requester_seen_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    linked_training_name_id: Mapped[int | None] = mapped_column(ForeignKey("training_names.id"), index=True, nullable=True)
    approved_training_name_id: Mapped[int | None] = mapped_column(ForeignKey("training_names.id"), index=True, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    suggested_category = relationship("TrainingCategory", foreign_keys=[suggested_category_id], lazy="selectin")
    requester = relationship("User", foreign_keys=[requester_user_id], lazy="selectin")
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id], lazy="selectin")
    form = relationship("Form", foreign_keys=[form_id], lazy="selectin")
    linked_training = relationship("TrainingName", foreign_keys=[linked_training_name_id], lazy="selectin")
    approved_training = relationship("TrainingName", foreign_keys=[approved_training_name_id], lazy="selectin")
