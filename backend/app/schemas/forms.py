# app/schemas/forms.py
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Priority, Quarter, HrDecision


# --------------------------
# REQUESTS
# --------------------------
class FormCreateRequest(BaseModel):
    area_id: int
    # ✅ legacy: frontend może wysyłać null albo nie wysyłać wcale
    cost_center_id: int | None = None


class CommentRequest(BaseModel):
    comment: str = Field(min_length=1, max_length=4000)


class HrReplyRequest(BaseModel):
    """HR podejmuje decyzję dla całego wniosku (nie per pozycja)."""

    decision: HrDecision
    budget_total: float | None = Field(default=None, ge=0)
    comment: str | None = Field(default=None, max_length=4000)


class FormItemCreateRequest(BaseModel):
    # ✅ MPK per pozycja
    cost_center_id: int

    training_category_id: int
    training_name_id: int
    priority: Priority = Field(default=Priority.MEDIUM)
    quarter: Quarter
    business_need_id: int

    employees_count: int = Field(ge=1)
    employee_full_name: str | None = None

    estimated_cost_per_person: float = Field(ge=0)
    estimated_hours_per_person: float = Field(ge=0)

    contact_person: str | None = None
    notes: str | None = None


class FormItemUpdateRequest(BaseModel):
    cost_center_id: int | None = None

    training_category_id: int | None = None
    training_name_id: int | None = None
    priority: Priority | None = None
    quarter: Quarter | None = None
    business_need_id: int | None = None

    employees_count: int | None = Field(default=None, ge=1)
    employee_full_name: str | None = None

    estimated_cost_per_person: float | None = Field(default=None, ge=0)
    estimated_hours_per_person: float | None = Field(default=None, ge=0)

    contact_person: str | None = None
    notes: str | None = None


class HrBudgetUpdateRequest(BaseModel):
    hr_budget_total: float = Field(ge=0)


class HrItemUpdateRequest(BaseModel):
    """HR edycja pól odpowiedzi per pozycja."""

    hr_budget_total: float | None = Field(default=None, ge=0)
    hr_decision: HrDecision | None = None
    hr_comment: str | None = Field(default=None, max_length=4000)


# --------------------------
# RESPONSES
# --------------------------
class FormResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    area_id: int

    # legacy (zostaje nullable)
    cost_center_id: int | None

    created_by_user_id: int
    created_by_full_name: str | None = None
    status: str

    created_at: datetime | None = None
    updated_at: datetime | None = None

    last_comment: str | None = None
    last_commented_by_role: str | None = None
    last_commented_at: datetime | None = None

    # HR response (per whole request)
    hr_budget_total: float | None = None
    hr_decision: HrDecision | None = None
    hr_comment: str | None = None


class FormItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int

    # ✅ MPK per pozycja
    cost_center_id: int

    training_category_id: int
    training_name_id: int
    priority: Priority
    quarter: Quarter
    business_need_id: int

    employees_count: int
    employee_full_name: str | None = None

    estimated_cost_per_person: float
    estimated_hours_per_person: float

    contact_person: str | None = None
    notes: str | None = None

    hr_budget_total: float | None = None

    hr_decision: HrDecision | None = None
    hr_comment: str | None = None


class FormDetailsResponse(FormResponse):
    items: list[FormItemResponse] = Field(default_factory=list)


# --------------------------
# HISTORY / EVENTS
# --------------------------
class FormEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int

    action: str
    actor_user_id: int | None = None
    actor_full_name: str | None = None
    actor_role: str | None = None

    from_status: str | None = None
    to_status: str | None = None

    item_id: int | None = None
    comment: str | None = None
    meta: dict[str, Any] | None = None

    created_at: datetime


# --------------------------
# LIST / PAGINATION
# --------------------------
class FormListResponse(BaseModel):
    items: list[FormResponse] = Field(default_factory=list)
    total: int
    limit: int
    offset: int
