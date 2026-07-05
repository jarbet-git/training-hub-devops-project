from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.area import Area


class CostCenter(Base):
    __tablename__ = "cost_centers"

    id: Mapped[int] = mapped_column(primary_key=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id", ondelete="CASCADE"), index=True, nullable=False)

    code: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    name_pl: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(200), nullable=True)

    area: Mapped[Area] = relationship(back_populates="cost_centers")
