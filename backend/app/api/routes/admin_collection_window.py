from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.collection_window import CollectionWindow
from app.models.user import User
from app.schemas.collection_window import CollectionWindowResponse, CollectionWindowUpdateRequest

router = APIRouter(prefix="/admin/collection-window", tags=["admin:collection-window"])


def require_roles(user: User, allowed: set[str]):
    role = getattr(user, "role", None)
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


@router.get("", response_model=CollectionWindowResponse)
def admin_get_collection_window(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"HR", "ADMIN"})
    win = db.scalar(select(CollectionWindow).limit(1))
    if not win:
        return CollectionWindowResponse(is_open=True, updated_at=None)
    return CollectionWindowResponse(is_open=win.is_open, updated_at=getattr(win, "updated_at", None))


@router.patch("", response_model=CollectionWindowResponse)
def admin_set_collection_window(
    payload: CollectionWindowUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles(user, {"HR", "ADMIN"})

    win = db.scalar(select(CollectionWindow).limit(1))
    if not win:
        win = CollectionWindow(is_open=payload.is_open)
        db.add(win)
    else:
        win.is_open = payload.is_open

    db.commit()
    db.refresh(win)
    return CollectionWindowResponse(is_open=win.is_open, updated_at=getattr(win, "updated_at", None))
