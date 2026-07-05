from __future__ import annotations

from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Numeric

from app.core.database import Base


class TrainingName(Base):
    __tablename__ = "training_names"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("training_categories.id", ondelete="CASCADE"), index=True, nullable=False)

    name_pl: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[str] = mapped_column(String(200), nullable=False)

    default_cost_per_person: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="0")
    default_hours_per_person: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, server_default="0")

    category: Mapped["TrainingCategory"] = relationship(back_populates="trainings")
