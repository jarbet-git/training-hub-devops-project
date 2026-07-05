from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow


class FormEvent(Base):
    __tablename__ = "form_events"

    id: Mapped[int] = mapped_column(primary_key=True)

    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id"), index=True, nullable=False)

    # kto wykonał akcję (dla systemowych zdarzeń możesz kiedyś dać NULL)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # co się stało
    action: Mapped[str] = mapped_column(String(60), index=True, nullable=False)

    # statusy (jeśli dotyczy)
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # item_id trzymamy jako INT bez FK (żeby historia przetrwała delete item)
    item_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)

    # komentarz (np. request-changes / close)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # meta: np. zmienione pola, budżet, snapshot
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    # relacje (opcjonalne, ale wygodne)
    form = relationship("Form", back_populates="events")
    actor = relationship("User")
