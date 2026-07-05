from __future__ import annotations

"""Compatibility endpoint.

Legacy frontend called:
  GET /api/cost-centers?area_id=...&q=...

Canonical endpoint used by the current plan:
  GET /api/dict/areas/{area_id}/cost-centers?q=...

This router keeps older clients working.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.cost_center import CostCenter
from app.models.user import User

router = APIRouter(prefix="/cost-centers", tags=["Cost Centers"])


def _allowed_area_ids(user: User) -> set[int] | None:
    """Area scoping.

    - HR/ADMIN -> None (no restriction)
    - EDITOR/MANAGER -> set of assigned area IDs (can be empty = no access)
    """
    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return None
    return {a.id for a in (getattr(user, "areas", None) or [])}


@router.get("", response_model=list[dict])
def list_cost_centers_compat(
    area_id: int = Query(..., ge=1),
    q: str | None = Query(None, min_length=0, max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed = _allowed_area_ids(user)
    if allowed is not None:
        if not allowed or area_id not in allowed:
            raise HTTPException(status_code=403, detail="Area not allowed")

    stmt = select(CostCenter).where(CostCenter.area_id == area_id)
    if q:
        qq = f"%{q.strip()}%"
        stmt = stmt.where(CostCenter.code.ilike(qq))

    rows = db.execute(stmt.order_by(CostCenter.code.asc()).limit(100)).scalars().all()
    return [
        {
            "id": r.id,
            "code": r.code,
            "name_pl": getattr(r, "name_pl", None),
            "name_en": getattr(r, "name_en", None),
        }
        for r in rows
    ]
