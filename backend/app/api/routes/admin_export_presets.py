from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_hr_or_admin
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.export_preset import ExportPreset
from app.models.user import User
from app.reports.export_columns import normalize_columns
from app.schemas.export_preset import (
    ExportPresetCreateRequest,
    ExportPresetResponse,
    ExportPresetUpdateRequest,
)

router = APIRouter(prefix="/admin/export-presets", tags=["admin-export-presets"], dependencies=[Depends(require_hr_or_admin)])


def _can_edit(preset: ExportPreset, user: User) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    # HR can only edit own presets
    return preset.created_by_user_id == user.id


@router.get("", response_model=list[ExportPresetResponse])
def list_presets(
    mine_only: bool = Query(False, description="Only presets created by current user"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if mine_only:
        stmt = select(ExportPreset).where(ExportPreset.created_by_user_id == current_user.id).order_by(ExportPreset.name.asc())
    else:
        stmt = (
            select(ExportPreset)
            .where(
                or_(
                    ExportPreset.created_by_user_id == current_user.id,
                    ExportPreset.is_shared.is_(True),
                    ExportPreset.created_by_user_id.is_(None),
                )
            )
            .order_by(ExportPreset.is_shared.desc(), ExportPreset.name.asc())
        )

    return db.execute(stmt).scalars().all()


@router.post("", response_model=ExportPresetResponse)
def create_preset(
    payload: ExportPresetCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        cols = normalize_columns(payload.columns)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if payload.is_shared and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only ADMIN can create shared presets")

    preset = ExportPreset(
        name=payload.name.strip(),
        columns=cols,
        export_format=(payload.export_format or "xlsx").lower().strip(),
        export_lang=(payload.export_lang or "pl").lower().strip(),
        filters=payload.filters,
        created_by_user_id=current_user.id,
        is_shared=bool(payload.is_shared),
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.put("/{preset_id}", response_model=ExportPresetResponse)
def update_preset(
    preset_id: int,
    payload: ExportPresetUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = db.get(ExportPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # System preset: editable only by ADMIN
    if preset.created_by_user_id is None and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="System preset is read-only")

    if not _can_edit(preset, current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    # Pydantic: only apply fields that were provided
    provided = payload.model_dump(exclude_unset=True)

    if "name" in provided and payload.name is not None:
        preset.name = payload.name.strip()

    if "columns" in provided and payload.columns is not None:
        try:
            preset.columns = normalize_columns(payload.columns)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    if "export_format" in provided and payload.export_format is not None:
        preset.export_format = (payload.export_format or "xlsx").lower().strip()

    if "export_lang" in provided and payload.export_lang is not None:
        preset.export_lang = (payload.export_lang or "pl").lower().strip()

    # filters can be explicitly cleared by sending null
    if "filters" in provided:
        preset.filters = payload.filters

    if "is_shared" in provided and payload.is_shared is not None:
        if payload.is_shared and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only ADMIN can share presets")
        preset.is_shared = bool(payload.is_shared)

    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/{preset_id}")
def delete_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = db.get(ExportPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # System preset can be deleted only by ADMIN
    if preset.created_by_user_id is None and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="System preset cannot be deleted")

    if not _can_edit(preset, current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(preset)
    db.commit()
    return {"ok": True}
