# app/api/routes/collection_window.py

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.collection_window import CollectionWindow
from app.schemas.collection_window import CollectionWindowResponse

router = APIRouter(prefix="", tags=["collection-window"])


@router.get("/collection-window", response_model=CollectionWindowResponse)
def get_collection_window(db: Session = Depends(get_db)):
    # ✅ zawsze bierzemy "najświeższy" rekord
    win = db.scalar(select(CollectionWindow).order_by(CollectionWindow.id.desc()).limit(1))
    if not win:
        # jeśli nie ma rekordu, traktujemy jako "open" (MVP)
        return CollectionWindowResponse(is_open=True, updated_at=None)

    return CollectionWindowResponse(is_open=win.is_open, updated_at=getattr(win, "updated_at", None))
