from __future__ import annotations

from pydantic import BaseModel, Field


class DashboardYearSummary(BaseModel):
    year: int
    forms: int = 0
    items: int = 0
    participants: int = 0
    estimated_cost_total: float = 0
    estimated_hours_total: float = 0
    approved_budget_total: float = 0


class DashboardMonthlyPoint(BaseModel):
    month: int
    current_forms: int = 0
    previous_forms: int = 0
    current_participants: int = 0
    previous_participants: int = 0
    current_estimated_cost_total: float = 0
    previous_estimated_cost_total: float = 0


class DashboardComparisonResponse(BaseModel):
    current_year: int
    previous_year: int
    has_previous_year_data: bool = False
    current: DashboardYearSummary
    previous: DashboardYearSummary
    months: list[DashboardMonthlyPoint] = Field(default_factory=list)
