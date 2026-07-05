from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ExportFormat = Literal["xlsx", "csv"]
ExportLang = Literal["pl", "en"]


class ExportPresetCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    columns: list[str] = Field(default_factory=list, min_length=1)

    # Always saved in preset (frontend always sends these)
    export_format: ExportFormat = "xlsx"
    export_lang: ExportLang = "pl"

    # Optional saved filters
    filters: dict[str, Any] | None = None

    is_shared: bool = False


class ExportPresetUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    columns: list[str] | None = Field(default=None)

    export_format: ExportFormat | None = None
    export_lang: ExportLang | None = None
    filters: dict[str, Any] | None = None

    is_shared: bool | None = None


class ExportPresetResponse(BaseModel):
    id: int
    name: str
    columns: list[str]
    export_format: ExportFormat
    export_lang: ExportLang
    filters: dict[str, Any] | None = None

    is_shared: bool
    created_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime
