from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

from app.core.database import Base


class BusinessNeed(Base):
    __tablename__ = "business_needs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_pl: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[str] = mapped_column(String(200), nullable=False)
