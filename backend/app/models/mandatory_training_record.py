from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.area import Area
    from app.models.cost_center import CostCenter
    from app.models.mandatory_training_import import MandatoryTrainingImport


class MandatoryTrainingRecord(Base):
    __tablename__ = "mandatory_training_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    import_id: Mapped[int] = mapped_column(ForeignKey("mandatory_training_imports.id", ondelete="CASCADE"), nullable=False, index=True)

    employee_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    local_sap_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    employee_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    cost_center_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    cost_center_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id", ondelete="SET NULL"), nullable=True, index=True)
    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id", ondelete="SET NULL"), nullable=True, index=True)
    is_mapped: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    training_name: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    completion_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mandatory_training_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    cost_per_person: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    source_row_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    import_batch: Mapped[MandatoryTrainingImport] = relationship("MandatoryTrainingImport", back_populates="records", lazy="selectin")
    cost_center: Mapped[CostCenter | None] = relationship("CostCenter", lazy="selectin")
    area: Mapped[Area | None] = relationship("Area", lazy="selectin")
