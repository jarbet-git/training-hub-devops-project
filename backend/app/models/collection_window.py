from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.time import utcnow


class CollectionWindow(Base):
    __tablename__ = "collection_windows"

    id: Mapped[int] = mapped_column(primary_key=True)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # opcjonalnie: ramy czasowe
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
