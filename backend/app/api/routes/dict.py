from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.area import Area
from app.models.cost_center import CostCenter
from app.models.training_category import TrainingCategory
from app.models.training_name import TrainingName
from app.models.business_need import BusinessNeed
from app.schemas.dict import DictItem


def _allowed_area_ids(user) -> "set[int] | None":
    """Area scoping.

    - HR/ADMIN -> None (no restriction)
    - EDITOR/MANAGER -> set of assigned area IDs (can be empty = no access)
    """
    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return None

    return {int(a.id) for a in (getattr(user, "areas", None) or []) if getattr(a, "id", None) is not None}

router = APIRouter(prefix="/dict", tags=["dict"])


@router.get("/areas", response_model=list[DictItem])
def list_areas(
    q: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    stmt = select(Area).order_by(Area.code)

    allowed = _allowed_area_ids(user)
    if allowed is not None:
        if not allowed:
            return []
        stmt = stmt.where(Area.id.in_(allowed))

    if q:
        stmt = stmt.where(Area.code.ilike(f"%{q}%"))
    items = db.scalars(stmt).all()
    return [DictItem(id=x.id, code=x.code, name_pl=x.name_pl, name_en=x.name_en) for x in items]


# --- Alias: frontend może wołać /dict/my-areas ---
@router.get("/my-areas", response_model=list[DictItem])
def my_areas(
    q: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return list_areas(q=q, db=db, user=user)


@router.get("/areas/{area_id}/cost-centers", response_model=list[DictItem])
def list_cost_centers(
    area_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    allowed = _allowed_area_ids(user)
    if allowed is not None and area_id not in allowed:
        raise HTTPException(status_code=403, detail="Not allowed to access this area")

    stmt = select(CostCenter).where(CostCenter.area_id == area_id).order_by(CostCenter.code)
    if q:
        stmt = stmt.where(CostCenter.code.ilike(f"%{q}%"))
    items = db.scalars(stmt).all()
    return [DictItem(id=x.id, code=x.code, name_pl=x.name_pl, name_en=x.name_en) for x in items]


@router.get("/categories", response_model=list[DictItem])
def list_categories(q: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    stmt = select(TrainingCategory).order_by(TrainingCategory.name_pl)
    if q:
        stmt = stmt.where(
            TrainingCategory.name_pl.ilike(f"%{q}%") | TrainingCategory.name_en.ilike(f"%{q}%")
        )
    items = db.scalars(stmt).all()
    return [DictItem(id=x.id, name_pl=x.name_pl, name_en=x.name_en) for x in items]


# --- Alias: /dict/training-categories ---
@router.get("/training-categories", response_model=list[DictItem])
def training_categories(q: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_categories(q=q, db=db, _=_)


@router.get("/categories/{category_id}/trainings", response_model=list[DictItem])
def list_trainings(category_id: int, q: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    stmt = select(TrainingName).where(TrainingName.category_id == category_id).order_by(TrainingName.name_pl)
    if q:
        stmt = stmt.where(
            TrainingName.name_pl.ilike(f"%{q}%") | TrainingName.name_en.ilike(f"%{q}%")
        )
    items = db.scalars(stmt).all()
    return [
        DictItem(
            id=x.id,
            name_pl=x.name_pl,
            name_en=x.name_en,
            category_id=x.category_id,
            default_cost_per_person=(float(x.default_cost_per_person) if x.default_cost_per_person is not None else None),
            default_hours_per_person=(float(x.default_hours_per_person) if x.default_hours_per_person is not None else None),
        )
        for x in items
    ]


# --- Alias: /dict/training-categories/{id}/training-names ---
@router.get("/training-categories/{category_id}/training-names", response_model=list[DictItem])
def training_names(category_id: int, q: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_trainings(category_id=category_id, q=q, db=db, _=_)




@router.get("/training-names", response_model=list[DictItem])
def search_training_names(
    q: str | None = None,
    category_id: int | None = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Global training names search.

    - If `q` is provided, searches by PL/EN name (ILIKE).
    - If `category_id` is provided, scopes results to that category.
    - `limit` protects from huge payloads.

    Frontend uses this for the Training combobox with optional category filter.
    """

    limit = max(1, min(int(limit or 30), 100))

    stmt = select(TrainingName)
    if category_id is not None:
        stmt = stmt.where(TrainingName.category_id == category_id)

    if q:
        stmt = stmt.where(
            TrainingName.name_pl.ilike(f"%{q}%") | TrainingName.name_en.ilike(f"%{q}%")
        )

    stmt = stmt.order_by(TrainingName.name_pl).limit(limit)

    items = db.scalars(stmt).all()
    return [
        DictItem(
            id=x.id,
            name_pl=x.name_pl,
            name_en=x.name_en,
            category_id=x.category_id,
            default_cost_per_person=(float(x.default_cost_per_person) if x.default_cost_per_person is not None else None),
            default_hours_per_person=(float(x.default_hours_per_person) if x.default_hours_per_person is not None else None),
        )
        for x in items
    ]
@router.get("/business-needs", response_model=list[DictItem])
def list_business_needs(q: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    stmt = select(BusinessNeed).order_by(BusinessNeed.name_pl)
    if q:
        stmt = stmt.where(
            BusinessNeed.name_pl.ilike(f"%{q}%") | BusinessNeed.name_en.ilike(f"%{q}%")
        )
    items = db.scalars(stmt).all()
    return [DictItem(id=x.id, name_pl=x.name_pl, name_en=x.name_en) for x in items]
