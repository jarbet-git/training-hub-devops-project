from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class ExportPreset(Base):
    __tablename__ = "export_presets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False, index=True)

    # Ordered list of column keys (e.g. ["area", "mpk", ...])
    columns = Column(JSONB, nullable=False, default=list)

    # Export preferences (saved always in preset)
    export_format = Column(String(8), nullable=False, default="xlsx")  # xlsx|csv
    export_lang = Column(String(2), nullable=False, default="pl")  # pl|en

    # Optional saved filters (e.g. {"statuses":[...], "area_ids":[...], ...})
    filters = Column(JSONB, nullable=True)

    # NULL = system preset
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Shared presets are visible to other HR/Admin users (in addition to the owner)
    is_shared = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    created_by = relationship("User")
