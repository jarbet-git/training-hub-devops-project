from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.cost_center import CostCenter


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    name_pl: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(200), nullable=True)

    cost_centers: Mapped[list[CostCenter]] = relationship(
        back_populates="area", cascade="all, delete-orphan"
    )
