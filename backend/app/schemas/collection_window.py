from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class CollectionWindowResponse(BaseModel):
    is_open: bool
    updated_at: datetime | None = None


class CollectionWindowUpdateRequest(BaseModel):
    is_open: bool = Field(...)
