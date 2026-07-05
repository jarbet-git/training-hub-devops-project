from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserArea(Base):
    """Association table: user ↔ area."""

    __tablename__ = "user_areas"
    __table_args__ = (
        UniqueConstraint("user_id", "area_id", name="uq_user_areas_user_area"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id", ondelete="CASCADE"), index=True)

    user = relationship("User", back_populates="user_areas")
    area = relationship("Area")
