from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String

from app.core.database import Base


class TrainingCategory(Base):
    __tablename__ = "training_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_pl: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[str] = mapped_column(String(200), nullable=False)

    trainings: Mapped[list["TrainingName"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )
