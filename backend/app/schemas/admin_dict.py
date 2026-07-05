from __future__ import annotations

from pydantic import BaseModel, Field


# --------- AREAS ---------
class AreaCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name_pl: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)


class AreaUpdateRequest(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name_pl: str | None = Field(default=None, max_length=200)
    name_en: str | None = Field(default=None, max_length=200)


class AreaResponse(BaseModel):
    id: int
    code: str
    name_pl: str | None = None
    name_en: str | None = None


# --------- COST CENTERS ---------
class CostCenterCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name_pl: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)


class CostCenterUpdateRequest(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name_pl: str | None = Field(default=None, max_length=200)
    name_en: str | None = Field(default=None, max_length=200)


class CostCenterResponse(BaseModel):
    id: int
    area_id: int
    code: str
    name_pl: str | None = None
    name_en: str | None = None


# --------- TRAINING CATEGORIES ---------
class TrainingCategoryCreateRequest(BaseModel):
    name_pl: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)


class TrainingCategoryUpdateRequest(BaseModel):
    name_pl: str | None = Field(default=None, min_length=1, max_length=200)
    name_en: str | None = Field(default=None, min_length=1, max_length=200)


class TrainingCategoryResponse(BaseModel):
    id: int
    name_pl: str
    name_en: str


# --------- TRAINING NAMES ---------
class TrainingNameCreateRequest(BaseModel):
    name_pl: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)
    default_cost_per_person: float = Field(0, ge=0)
    default_hours_per_person: float = Field(0, ge=0)


class TrainingNameUpdateRequest(BaseModel):
    name_pl: str | None = Field(default=None, min_length=1, max_length=200)
    name_en: str | None = Field(default=None, min_length=1, max_length=200)
    default_cost_per_person: float | None = Field(default=None, ge=0)
    default_hours_per_person: float | None = Field(default=None, ge=0)


class TrainingNameResponse(BaseModel):
    id: int
    category_id: int
    name_pl: str
    name_en: str
    default_cost_per_person: float
    default_hours_per_person: float


# --------- BUSINESS NEEDS ---------
class BusinessNeedCreateRequest(BaseModel):
    name_pl: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)


class BusinessNeedUpdateRequest(BaseModel):
    name_pl: str | None = Field(default=None, min_length=1, max_length=200)
    name_en: str | None = Field(default=None, min_length=1, max_length=200)


class BusinessNeedResponse(BaseModel):
    id: int
    name_pl: str
    name_en: str
