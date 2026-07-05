from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User

from app.models.area import Area
from app.models.cost_center import CostCenter
from app.models.training_category import TrainingCategory
from app.models.training_name import TrainingName
from app.models.business_need import BusinessNeed
from app.models.form import Form
from app.models.form_item import FormItem

from app.schemas.admin_dict import (
    AreaCreateRequest,
    AreaUpdateRequest,
    AreaResponse,
    CostCenterCreateRequest,
    CostCenterUpdateRequest,
    CostCenterResponse,
    TrainingCategoryCreateRequest,
    TrainingCategoryUpdateRequest,
    TrainingCategoryResponse,
    TrainingNameCreateRequest,
    TrainingNameUpdateRequest,
    TrainingNameResponse,
    BusinessNeedCreateRequest,
    BusinessNeedUpdateRequest,
    BusinessNeedResponse,
)

router = APIRouter(prefix="/admin/dict", tags=["admin-dict"])


# --------- helpers ---------
def require_hr_or_admin(user: User):
    role = getattr(user, "role", None)
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


def _conflict_in_use(entity_name: str):
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Cannot delete: {entity_name} is used by existing forms/items",
    )


# --------- AREAS ---------
@router.get("/areas", response_model=list[AreaResponse])
def list_areas_admin(
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)
    stmt = select(Area)
    if q:
        qq = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Area.code).like(qq)
            | func.lower(Area.name_pl).like(qq)
            | func.lower(Area.name_en).like(qq)
        )
    stmt = stmt.order_by(Area.code)
    items = db.scalars(stmt).all()
    return [AreaResponse(id=a.id, code=a.code, name_pl=a.name_pl, name_en=a.name_en) for a in items]


@router.get("/areas/{area_id}/cost-centers", response_model=list[CostCenterResponse])
def list_cost_centers_admin(
    area_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)
    area = db.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    stmt = select(CostCenter).where(CostCenter.area_id == area_id)
    if q:
        qq = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(CostCenter.code).like(qq)
            | func.lower(CostCenter.name_pl).like(qq)
            | func.lower(CostCenter.name_en).like(qq)
        )
    stmt = stmt.order_by(CostCenter.code)
    items = db.scalars(stmt).all()
    return [
        CostCenterResponse(id=c.id, area_id=c.area_id, code=c.code, name_pl=c.name_pl, name_en=c.name_en)
        for c in items
    ]




@router.get("/cost-centers", response_model=list[CostCenterResponse])
def list_cost_centers_admin_global(
    q: str | None = Query(None, min_length=0, max_length=100),
    area_id: int | None = Query(None, ge=1),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List/search cost centers.

    - If area_id is provided: returns cost centers for that area.
    - If area_id is None: searches across all areas.

    Used by the Admin MPK tab to support an "All areas" filter.
    """
    require_hr_or_admin(user)
    stmt = select(CostCenter)
    if area_id is not None:
        area = db.get(Area, area_id)
        if not area:
            raise HTTPException(status_code=404, detail="Area not found")
        stmt = stmt.where(CostCenter.area_id == area_id)

    if q:
        qq = f"%{q.lower().strip()}%"
        stmt = stmt.where(
            func.lower(CostCenter.code).like(qq)
            | func.lower(CostCenter.name_pl).like(qq)
            | func.lower(CostCenter.name_en).like(qq)
        )

    items = db.scalars(stmt.order_by(CostCenter.code).limit(limit)).all()
    return [
        CostCenterResponse(id=c.id, area_id=c.area_id, code=c.code, name_pl=c.name_pl, name_en=c.name_en)
        for c in items
    ]
@router.post("/areas", response_model=AreaResponse)
def create_area(
    payload: AreaCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    exists = db.scalar(select(Area).where(func.lower(Area.code) == payload.code.lower()))
    if exists:
        raise HTTPException(status_code=409, detail="Area code already exists")

    area = Area(code=payload.code, name_pl=payload.name_pl, name_en=payload.name_en)
    db.add(area)
    db.commit()
    db.refresh(area)

    return AreaResponse(id=area.id, code=area.code, name_pl=area.name_pl, name_en=area.name_en)


@router.patch("/areas/{area_id}", response_model=AreaResponse)
def update_area(
    area_id: int,
    payload: AreaUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    area = db.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        # check uniqueness
        exists = db.scalar(
            select(Area).where(func.lower(Area.code) == data["code"].lower(), Area.id != area_id)
        )
        if exists:
            raise HTTPException(status_code=409, detail="Area code already exists")

    for k, v in data.items():
        setattr(area, k, v)

    db.commit()
    db.refresh(area)
    return AreaResponse(id=area.id, code=area.code, name_pl=area.name_pl, name_en=area.name_en)


@router.delete("/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_area(
    area_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    area = db.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    used_forms = db.scalar(select(Form.id).where(Form.area_id == area_id).limit(1))
    used_cc = db.scalar(select(CostCenter.id).where(CostCenter.area_id == area_id).limit(1))
    if used_forms or used_cc:
        _conflict_in_use("Area")

    db.delete(area)
    db.commit()
    return


# --------- COST CENTERS ---------
@router.post("/areas/{area_id}/cost-centers", response_model=CostCenterResponse)
def create_cost_center(
    area_id: int,
    payload: CostCenterCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    area = db.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    # MPK (cost center) code must be globally unique (one MPK cannot belong to multiple areas)
    exists = db.scalar(select(CostCenter).where(func.lower(CostCenter.code) == payload.code.lower()))
    if exists:
        raise HTTPException(status_code=409, detail="Cost center code already exists")

    cc = CostCenter(area_id=area_id, code=payload.code, name_pl=payload.name_pl, name_en=payload.name_en)
    db.add(cc)
    db.commit()
    db.refresh(cc)

    return CostCenterResponse(
        id=cc.id, area_id=cc.area_id, code=cc.code, name_pl=cc.name_pl, name_en=cc.name_en
    )


@router.patch("/cost-centers/{cost_center_id}", response_model=CostCenterResponse)
def update_cost_center(
    cost_center_id: int,
    payload: CostCenterUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    cc = db.get(CostCenter, cost_center_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Cost center not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        # MPK (cost center) code must be globally unique (one MPK cannot belong to multiple areas)
        exists = db.scalar(
            select(CostCenter).where(
                func.lower(CostCenter.code) == data["code"].lower(),
                CostCenter.id != cost_center_id,
            )
        )
        if exists:
            raise HTTPException(status_code=409, detail="Cost center code already exists")

    for k, v in data.items():
        setattr(cc, k, v)

    db.commit()
    db.refresh(cc)

    return CostCenterResponse(
        id=cc.id, area_id=cc.area_id, code=cc.code, name_pl=cc.name_pl, name_en=cc.name_en
    )


@router.delete("/cost-centers/{cost_center_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost_center(
    cost_center_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    cc = db.get(CostCenter, cost_center_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Cost center not found")

    used = db.scalar(select(Form.id).where(Form.cost_center_id == cost_center_id).limit(1))
    if used:
        _conflict_in_use("CostCenter")

    db.delete(cc)
    db.commit()
    return


# --------- TRAINING CATEGORIES ---------
@router.get("/categories", response_model=list[TrainingCategoryResponse])
def list_categories_admin(
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)
    stmt = select(TrainingCategory)
    if q:
        qq = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(TrainingCategory.name_pl).like(qq) | func.lower(TrainingCategory.name_en).like(qq))
    stmt = stmt.order_by(TrainingCategory.name_pl)
    items = db.scalars(stmt).all()
    return [TrainingCategoryResponse(id=c.id, name_pl=c.name_pl, name_en=c.name_en) for c in items]


@router.get("/categories/{category_id}/trainings", response_model=list[TrainingNameResponse])
def list_trainings_admin(
    category_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)
    cat = db.get(TrainingCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Training category not found")
    stmt = select(TrainingName).where(TrainingName.category_id == category_id)
    if q:
        qq = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(TrainingName.name_pl).like(qq) | func.lower(TrainingName.name_en).like(qq))
    stmt = stmt.order_by(TrainingName.name_pl)
    items = db.scalars(stmt).all()
    return [
        TrainingNameResponse(
            id=t.id,
            category_id=t.category_id,
            name_pl=t.name_pl,
            name_en=t.name_en,
            default_cost_per_person=t.default_cost_per_person,
            default_hours_per_person=t.default_hours_per_person,
        )
        for t in items
    ]




@router.get("/trainings", response_model=list[TrainingNameResponse])
def search_trainings_admin(
    q: str | None = None,
    category_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Search trainings (optionally in a category). For global search require at least 2 chars."""
    require_hr_or_admin(user)

    qq_raw = (q or "").strip()
    if category_id is None and len(qq_raw) < 2:
        return []

    stmt = select(TrainingName)
    if category_id is not None:
        stmt = stmt.where(TrainingName.category_id == category_id)
    if qq_raw:
        qq = f"%{qq_raw.lower()}%"
        stmt = stmt.where(func.lower(TrainingName.name_pl).like(qq) | func.lower(TrainingName.name_en).like(qq))

    stmt = stmt.order_by(TrainingName.name_pl).limit(limit)
    items = db.scalars(stmt).all()
    return [
        TrainingNameResponse(
            id=t.id,
            category_id=t.category_id,
            name_pl=t.name_pl,
            name_en=t.name_en,
            default_cost_per_person=t.default_cost_per_person,
            default_hours_per_person=t.default_hours_per_person,
        )
        for t in items
    ]
@router.post("/categories", response_model=TrainingCategoryResponse)
def create_category(
    payload: TrainingCategoryCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    # prosta unikalność po name_pl (możesz zmienić na (name_pl,name_en) jeśli wolisz)
    exists = db.scalar(select(TrainingCategory).where(func.lower(TrainingCategory.name_pl) == payload.name_pl.lower()))
    if exists:
        raise HTTPException(status_code=409, detail="Category already exists")

    cat = TrainingCategory(name_pl=payload.name_pl, name_en=payload.name_en)
    db.add(cat)
    db.commit()
    db.refresh(cat)

    return TrainingCategoryResponse(id=cat.id, name_pl=cat.name_pl, name_en=cat.name_en)


@router.patch("/categories/{category_id}", response_model=TrainingCategoryResponse)
def update_category(
    category_id: int,
    payload: TrainingCategoryUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    cat = db.get(TrainingCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    data = payload.model_dump(exclude_unset=True)
    if "name_pl" in data:
        exists = db.scalar(
            select(TrainingCategory).where(
                func.lower(TrainingCategory.name_pl) == data["name_pl"].lower(),
                TrainingCategory.id != category_id,
            )
        )
        if exists:
            raise HTTPException(status_code=409, detail="Category already exists")

    for k, v in data.items():
        setattr(cat, k, v)

    db.commit()
    db.refresh(cat)
    return TrainingCategoryResponse(id=cat.id, name_pl=cat.name_pl, name_en=cat.name_en)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    cat = db.get(TrainingCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    used_items = db.scalar(select(FormItem.id).where(FormItem.training_category_id == category_id).limit(1))
    used_trainings = db.scalar(select(TrainingName.id).where(TrainingName.category_id == category_id).limit(1))
    if used_items or used_trainings:
        _conflict_in_use("TrainingCategory")

    db.delete(cat)
    db.commit()
    return


# --------- TRAINING NAMES ---------
@router.post("/categories/{category_id}/trainings", response_model=TrainingNameResponse)
def create_training(
    category_id: int,
    payload: TrainingNameCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    cat = db.get(TrainingCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    exists = db.scalar(
        select(TrainingName).where(
            TrainingName.category_id == category_id,
            func.lower(TrainingName.name_pl) == payload.name_pl.lower(),
        )
    )
    if exists:
        raise HTTPException(status_code=409, detail="Training already exists in this category")

    tn = TrainingName(
        category_id=category_id,
        name_pl=payload.name_pl,
        name_en=payload.name_en,
        default_cost_per_person=payload.default_cost_per_person,
        default_hours_per_person=payload.default_hours_per_person,
    )
    db.add(tn)
    db.commit()
    db.refresh(tn)

    return TrainingNameResponse(id=tn.id, category_id=tn.category_id, name_pl=tn.name_pl, name_en=tn.name_en, default_cost_per_person=float(getattr(tn,'default_cost_per_person',0) or 0), default_hours_per_person=float(getattr(tn,'default_hours_per_person',0) or 0))


@router.patch("/trainings/{training_id}", response_model=TrainingNameResponse)
def update_training(
    training_id: int,
    payload: TrainingNameUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    tn = db.get(TrainingName, training_id)
    if not tn:
        raise HTTPException(status_code=404, detail="Training not found")

    data = payload.model_dump(exclude_unset=True)
    if "name_pl" in data:
        exists = db.scalar(
            select(TrainingName).where(
                TrainingName.category_id == tn.category_id,
                func.lower(TrainingName.name_pl) == data["name_pl"].lower(),
                TrainingName.id != training_id,
            )
        )
        if exists:
            raise HTTPException(status_code=409, detail="Training already exists in this category")

    for k, v in data.items():
        setattr(tn, k, v)

    db.commit()
    db.refresh(tn)
    return TrainingNameResponse(id=tn.id, category_id=tn.category_id, name_pl=tn.name_pl, name_en=tn.name_en, default_cost_per_person=float(getattr(tn,'default_cost_per_person',0) or 0), default_hours_per_person=float(getattr(tn,'default_hours_per_person',0) or 0))


@router.delete("/trainings/{training_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_training(
    training_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    tn = db.get(TrainingName, training_id)
    if not tn:
        raise HTTPException(status_code=404, detail="Training not found")

    used = db.scalar(select(FormItem.id).where(FormItem.training_name_id == training_id).limit(1))
    if used:
        _conflict_in_use("TrainingName")

    db.delete(tn)
    db.commit()
    return


# --------- BUSINESS NEEDS ---------
@router.get("/business-needs", response_model=list[BusinessNeedResponse])
def list_business_needs_admin(
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)
    stmt = select(BusinessNeed)
    if q:
        qq = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(BusinessNeed.name_pl).like(qq) | func.lower(BusinessNeed.name_en).like(qq))
    stmt = stmt.order_by(BusinessNeed.name_pl)
    items = db.scalars(stmt).all()
    return [BusinessNeedResponse(id=b.id, name_pl=b.name_pl, name_en=b.name_en) for b in items]


@router.post("/business-needs", response_model=BusinessNeedResponse)
def create_business_need(
    payload: BusinessNeedCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    exists = db.scalar(select(BusinessNeed).where(func.lower(BusinessNeed.name_pl) == payload.name_pl.lower()))
    if exists:
        raise HTTPException(status_code=409, detail="Business need already exists")

    bn = BusinessNeed(name_pl=payload.name_pl, name_en=payload.name_en)
    db.add(bn)
    db.commit()
    db.refresh(bn)

    return BusinessNeedResponse(id=bn.id, name_pl=bn.name_pl, name_en=bn.name_en)


@router.patch("/business-needs/{need_id}", response_model=BusinessNeedResponse)
def update_business_need(
    need_id: int,
    payload: BusinessNeedUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    bn = db.get(BusinessNeed, need_id)
    if not bn:
        raise HTTPException(status_code=404, detail="Business need not found")

    data = payload.model_dump(exclude_unset=True)
    if "name_pl" in data:
        exists = db.scalar(
            select(BusinessNeed).where(
                func.lower(BusinessNeed.name_pl) == data["name_pl"].lower(),
                BusinessNeed.id != need_id,
            )
        )
        if exists:
            raise HTTPException(status_code=409, detail="Business need already exists")

    for k, v in data.items():
        setattr(bn, k, v)

    db.commit()
    db.refresh(bn)
    return BusinessNeedResponse(id=bn.id, name_pl=bn.name_pl, name_en=bn.name_en)


@router.delete("/business-needs/{need_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business_need(
    need_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_hr_or_admin(user)

    bn = db.get(BusinessNeed, need_id)
    if not bn:
        raise HTTPException(status_code=404, detail="Business need not found")

    used = db.scalar(select(FormItem.id).where(FormItem.business_need_id == need_id).limit(1))
    if used:
        _conflict_in_use("BusinessNeed")

    db.delete(bn)
    db.commit()
    return
