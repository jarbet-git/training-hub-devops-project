from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow

if TYPE_CHECKING:
    from app.models.mandatory_training_record import MandatoryTrainingRecord
    from app.models.user import User


class MandatoryTrainingImport(Base):
    __tablename__ = "mandatory_training_imports"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    imported_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    rows_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_imported: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_unmapped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    imported_by: Mapped[User] = relationship("User", lazy="selectin")
    records: Mapped[list[MandatoryTrainingRecord]] = relationship(
        "MandatoryTrainingRecord",
        back_populates="import_batch",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
