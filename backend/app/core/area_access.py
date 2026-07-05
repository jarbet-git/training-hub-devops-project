from __future__ import annotations

from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, user_area_access


def get_allowed_area_ids(db: Session, user: User) -> List[int]:
    """Return area ids the user is allowed to operate on.

    - HR/ADMIN: all areas (no scoping) -> returns [] (means "no restriction" at call sites)
    - Others: explicit assignments in user_area_access; fallback to legacy user.area_id
    """

    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return []

    ids = db.scalars(select(user_area_access.c.area_id).where(user_area_access.c.user_id == user.id)).all()
    if ids:
        return list(sorted(set(int(x) for x in ids)))

    # fallback for legacy single-area users
    if getattr(user, "area_id", None):
        return [int(user.area_id)]

    return []


def is_area_allowed(db: Session, user: User, area_id: int) -> bool:
    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return True

    allowed = get_allowed_area_ids(db, user)
    return int(area_id) in set(int(x) for x in allowed)
