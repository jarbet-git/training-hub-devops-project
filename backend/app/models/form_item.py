# backend/app/models/form_item.py
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Integer, Numeric, Text

from app.core.database import Base
from app.models.enums import Priority, HrDecision

if TYPE_CHECKING:
    from app.models.form import Form


class FormItem(Base):
    __tablename__ = "form_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id"), index=True, nullable=False)

    # ✅ MPK per pozycja
    cost_center_id: Mapped[int] = mapped_column(ForeignKey("cost_centers.id"), index=True, nullable=False)

    training_category_id: Mapped[int] = mapped_column(ForeignKey("training_categories.id"), index=True, nullable=False)
    training_name_id: Mapped[int] = mapped_column(ForeignKey("training_names.id"), index=True, nullable=False)

    priority: Mapped[str] = mapped_column(String(10), default=Priority.MEDIUM.value, nullable=False)
    # Q1..Q4 lub TBD (nieustalony kwartał)
    quarter: Mapped[str] = mapped_column(String(3), nullable=False)

    business_need_id: Mapped[int] = mapped_column(ForeignKey("business_needs.id"), index=True, nullable=False)

    employees_count: Mapped[int] = mapped_column(Integer, nullable=False)
    employee_full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    estimated_cost_per_person: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    estimated_hours_per_person: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    contact_person: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    hr_budget_total: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # HR odpowiedź per pozycja
    hr_decision: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hr_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    form: Mapped["Form"] = relationship(back_populates="items")
