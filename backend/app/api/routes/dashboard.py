from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import false, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.enums import FormStatus
from app.models.form import Form
from app.models.form_item import FormItem
from app.models.user import User
from app.schemas.dashboard import (
    DashboardComparisonResponse,
    DashboardMonthlyPoint,
    DashboardYearSummary,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _visible_form_stmt(user: User):
    role = (getattr(user, "role", None) or "").upper()

    if role in {"HR", "ADMIN"}:
        return select(Form).where(Form.status != FormStatus.DRAFT.value)

    if role == "MANAGER":
        allowed = {a.id for a in (user.areas or [])}
        if not allowed:
            return select(Form).where(false())
        return select(Form).where(Form.area_id.in_(allowed))

    # EDITOR and fallback: own portfolio
    return select(Form).where(Form.created_by_user_id == user.id)


def _to_float(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except Exception:
        return 0.0


@router.get("/summary", response_model=DashboardComparisonResponse)
def dashboard_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    current_year = datetime.now(timezone.utc).year
    previous_year = current_year - 1
    window_start = datetime(previous_year, 1, 1, tzinfo=timezone.utc)
    window_end = datetime(current_year + 1, 1, 1, tzinfo=timezone.utc)

    forms = db.scalars(
        _visible_form_stmt(user)
        .where(Form.created_at >= window_start, Form.created_at < window_end)
        .order_by(Form.created_at.asc(), Form.id.asc())
    ).all()

    form_ids = [f.id for f in forms]
    items = db.scalars(select(FormItem).where(FormItem.form_id.in_(form_ids))).all() if form_ids else []

    items_by_form: dict[int, list[FormItem]] = defaultdict(list)
    for item in items:
        items_by_form[item.form_id].append(item)

    yearly: dict[int, dict[str, float | int]] = {
        previous_year: {
            "forms": 0,
            "items": 0,
            "participants": 0,
            "estimated_cost_total": 0.0,
            "estimated_hours_total": 0.0,
            "approved_budget_total": 0.0,
        },
        current_year: {
            "forms": 0,
            "items": 0,
            "participants": 0,
            "estimated_cost_total": 0.0,
            "estimated_hours_total": 0.0,
            "approved_budget_total": 0.0,
        },
    }

    monthly: dict[int, dict[str, float | int]] = {
        month: {
            "current_forms": 0,
            "previous_forms": 0,
            "current_participants": 0,
            "previous_participants": 0,
            "current_estimated_cost_total": 0.0,
            "previous_estimated_cost_total": 0.0,
        }
        for month in range(1, 13)
    }

    for form in forms:
        if form.created_at is None:
            continue
        year = form.created_at.year
        if year not in {previous_year, current_year}:
            continue

        form_items = items_by_form.get(form.id, [])
        participants = sum(int(getattr(item, "employees_count", 0) or 0) for item in form_items)
        estimated_cost_total = sum(
            _to_float(getattr(item, "estimated_cost_per_person", None)) * int(getattr(item, "employees_count", 0) or 0)
            for item in form_items
        )
        estimated_hours_total = sum(
            _to_float(getattr(item, "estimated_hours_per_person", None)) * int(getattr(item, "employees_count", 0) or 0)
            for item in form_items
        )

        approved_budget_total = _to_float(getattr(form, "hr_budget_total", None))
        if approved_budget_total == 0:
            approved_budget_total = sum(_to_float(getattr(item, "hr_budget_total", None)) for item in form_items)

        year_bucket = yearly[year]
        year_bucket["forms"] += 1
        year_bucket["items"] += len(form_items)
        year_bucket["participants"] += participants
        year_bucket["estimated_cost_total"] += estimated_cost_total
        year_bucket["estimated_hours_total"] += estimated_hours_total
        year_bucket["approved_budget_total"] += approved_budget_total

        month_bucket = monthly[form.created_at.month]
        prefix = "current" if year == current_year else "previous"
        month_bucket[f"{prefix}_forms"] += 1
        month_bucket[f"{prefix}_participants"] += participants
        month_bucket[f"{prefix}_estimated_cost_total"] += estimated_cost_total

    def _year_summary(year: int) -> DashboardYearSummary:
        row = yearly[year]
        return DashboardYearSummary(
            year=year,
            forms=int(row["forms"]),
            items=int(row["items"]),
            participants=int(row["participants"]),
            estimated_cost_total=round(_to_float(row["estimated_cost_total"]), 2),
            estimated_hours_total=round(_to_float(row["estimated_hours_total"]), 2),
            approved_budget_total=round(_to_float(row["approved_budget_total"]), 2),
        )

    previous = _year_summary(previous_year)
    current = _year_summary(current_year)

    has_previous_year_data = any(
        [
            previous.forms > 0,
            previous.items > 0,
            previous.participants > 0,
            previous.estimated_cost_total > 0,
            previous.approved_budget_total > 0,
        ]
    )

    return DashboardComparisonResponse(
        current_year=current_year,
        previous_year=previous_year,
        has_previous_year_data=has_previous_year_data,
        current=current,
        previous=previous,
        months=[
            DashboardMonthlyPoint(
                month=month,
                current_forms=int(monthly[month]["current_forms"]),
                previous_forms=int(monthly[month]["previous_forms"]),
                current_participants=int(monthly[month]["current_participants"]),
                previous_participants=int(monthly[month]["previous_participants"]),
                current_estimated_cost_total=round(_to_float(monthly[month]["current_estimated_cost_total"]), 2),
                previous_estimated_cost_total=round(_to_float(monthly[month]["previous_estimated_cost_total"]), 2),
            )
            for month in range(1, 13)
        ],
    )
