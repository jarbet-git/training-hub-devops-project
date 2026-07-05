from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class MandatoryTrainingImportSummaryResponse(BaseModel):
    filename: str | None = None
    imported_at: datetime | None = None
    imported_by_user_id: int | None = None
    imported_by_full_name: str | None = None

    rows_total: int = 0
    rows_imported: int = 0
    rows_skipped: int = 0
    rows_unmapped: int = 0

    total_records: int = 0
    expired_count: int = 0
    due_in_7_count: int = 0
    due_in_30_count: int = 0
    indefinite_count: int = 0

    unmapped_cost_center_codes: list[str] = Field(default_factory=list)


class MandatoryTrainingSummaryResponse(BaseModel):
    total: int = 0
    expired: int = 0
    due_in_7: int = 0
    due_in_30: int = 0
    indefinite: int = 0
    imported_at: datetime | None = None
    imported_filename: str | None = None


class MandatoryTrainingRowResponse(BaseModel):
    id: int
    employee_id: str
    local_sap_id: str | None = None
    employee_name: str
    cost_center_code: str
    cost_center_name: str | None = None
    area_id: int | None = None
    is_mapped: bool
    training_name: str
    cost_per_person: float | None = None
    start_date: date | None = None
    expiration_date: date | None = None
    days_to_expiration: int | None = None
    completion_status: str | None = None
    mandatory_training_by: str | None = None
    status_bucket: str


class MandatoryTrainingListResponse(BaseModel):
    items: list[MandatoryTrainingRowResponse] = Field(default_factory=list)
    total: int
    limit: int
    offset: int
