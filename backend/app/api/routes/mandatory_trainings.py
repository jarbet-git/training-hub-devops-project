from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook, load_workbook
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.core.area_access import get_allowed_area_ids
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.cost_center import CostCenter
from app.models.mandatory_training_import import MandatoryTrainingImport
from app.models.mandatory_training_record import MandatoryTrainingRecord
from app.models.user import User
from app.schemas.mandatory_trainings import (
    MandatoryTrainingImportSummaryResponse,
    MandatoryTrainingListResponse,
    MandatoryTrainingRowResponse,
    MandatoryTrainingSummaryResponse,
)

router = APIRouter(prefix="/mandatory-trainings", tags=["mandatory-trainings"])
admin_router = APIRouter(prefix="/admin/mandatory-trainings", tags=["admin-mandatory-trainings"])

REQUIRED_HEADERS = {
    "Employee ID",
    "Worker",
    "Cost Center - ID",
    "Enrolled Content",
    "Cost per Person",
    "Completion Status",
    "Mandatory Training by",
    "Expiration Date",
}

LOCAL_SAP_ID_HEADERS = (
    "Local SAP ID",
    "Local Sap ID",
    "Local SAP Id",
    "Local SAPID",
    "Local SAP Employee ID",
)

START_DATE_HEADERS = (
    "Start Date",
    "Learning Start Date",
    "Enrollment Start Date",
    "Enrollment Date",
)

EXPORT_HEADERS = {
    "pl": [
        "Pracownik",
        "Local SAP ID",
        "Szkolenie",
        "MPK",
        "Nazwa MPK",
        "Koszt/os. (PLN)",
        "Data rozpoczęcia",
        "Data wygaśnięcia",
        "Do wygaśnięcia",
        "Status",
        "Completion Status",
        "Mandatory Training by",
    ],
    "en": [
        "Employee",
        "Local SAP ID",
        "Training",
        "Cost center",
        "Cost center name",
        "Cost/person (PLN)",
        "Start date",
        "Expiration date",
        "Time left",
        "Status",
        "Completion Status",
        "Mandatory Training by",
    ],
}


def _require_import_admin(user: User) -> None:
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"HR", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


def _require_reader(user: User) -> None:
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"EDITOR", "MANAGER", "HR", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


def _require_exporter(user: User) -> None:
    role = (getattr(user, "role", None) or "").upper()
    if role not in {"MANAGER", "HR", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _parse_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    txt = _normalize_text(value).replace(" ", "")
    if not txt:
        return None
    txt = txt.replace(",", ".")
    try:
        return Decimal(txt)
    except InvalidOperation:
        return None


def _parse_excel_serial_date(value: Any) -> date | None:
    try:
        serial = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None

    # Excel stores dates as serial day numbers. Workday exports sometimes keep that
    # representation in CSV files when regional formatting gets messy. The range
    # below covers realistic business dates and prevents accidental parsing of
    # short IDs or free text as dates.
    if 1 <= serial <= 80000:
        return date(1899, 12, 30) + timedelta(days=int(serial))
    return None


def _parse_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        return _parse_excel_serial_date(value)

    txt = _normalize_text(value).replace("\ufeff", "").replace("\xa0", " ")
    txt = " ".join(txt.split()).strip(" \"'")
    if not txt:
        return None

    if txt.replace(",", ".", 1).replace(".", "", 1).isdigit():
        parsed_serial = _parse_excel_serial_date(txt)
        if parsed_serial:
            return parsed_serial

    # ISO-like values from Workday / Excel, e.g. 2027-02-04 00:00:00 or
    # 2027-02-04T00:00:00Z. datetime.fromisoformat handles most of them.
    try:
        return datetime.fromisoformat(txt.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    normalized = " ".join(txt.replace(",", " ").split())
    formats = (
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%d.%m.%Y",
        "%d.%m.%Y %H:%M",
        "%d.%m.%Y %H:%M:%S",
        "%d.%m.%Y %H:%M:%S.%f",
        "%d/%m/%Y",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S.%f",
        "%m/%d/%Y",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M:%S.%f",
        "%d-%m-%Y",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%Y/%m/%d",
        "%Y/%m/%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
    )
    for fmt in formats:
        try:
            return datetime.strptime(normalized, fmt).date()
        except ValueError:
            continue
    return None


def _bucket_for(expiration_date: date | None, today: date | None = None) -> tuple[str, int | None]:
    if expiration_date is None:
        return "indefinite", None

    ref = today or date.today()
    days = (expiration_date - ref).days
    if expiration_date < ref:
        return "expired", days
    if expiration_date <= ref + timedelta(days=7):
        return "due_7", days
    if expiration_date <= ref + timedelta(days=30):
        return "due_30", days
    return "ok", days


def _row_to_response(row: MandatoryTrainingRecord, today: date | None = None) -> MandatoryTrainingRowResponse:
    bucket, days = _bucket_for(row.expiration_date, today=today)
    return MandatoryTrainingRowResponse(
        id=row.id,
        employee_id=row.employee_id,
        local_sap_id=row.local_sap_id,
        employee_name=row.employee_name,
        cost_center_code=row.cost_center_code,
        cost_center_name=row.cost_center_name,
        area_id=row.area_id,
        is_mapped=row.is_mapped,
        training_name=row.training_name,
        cost_per_person=(float(row.cost_per_person) if row.cost_per_person is not None else None),
        start_date=row.start_date,
        expiration_date=row.expiration_date,
        days_to_expiration=days,
        completion_status=row.completion_status,
        mandatory_training_by=row.mandatory_training_by,
        status_bucket=bucket,
    )


def _find_header_row(rows: list[tuple[Any, ...]]) -> tuple[int, dict[str, int]]:
    for row_idx, row in enumerate(rows[:10]):
        headers = [_normalize_text(x) for x in row]
        if "Employee ID" not in headers:
            continue
        header_map = {name: idx for idx, name in enumerate(headers) if name}
        if REQUIRED_HEADERS.issubset(set(header_map.keys())):
            return row_idx, header_map
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "Invalid file structure. Required columns are missing: "
            + ", ".join(sorted(REQUIRED_HEADERS))
        ),
    )


def _visible_area_ids(db: Session, user: User) -> set[int] | None:
    role = (getattr(user, "role", None) or "").upper()
    if role in {"HR", "ADMIN"}:
        return None
    ids = {int(x) for x in get_allowed_area_ids(db, user)}
    if getattr(user, "area_id", None):
        ids.add(int(user.area_id))
    return ids


class _ImportedRow(dict):
    pass


def _parse_workday_rows(rows: list[tuple[Any, ...]]) -> dict[str, Any]:
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty")

    header_row_idx, headers = _find_header_row(rows)

    raw_total = 0
    skipped = 0
    deduped: dict[tuple[str, str], _ImportedRow] = {}

    def _cell(row: tuple[Any, ...], name: str) -> Any:
        idx = headers.get(name)
        if idx is None or idx >= len(row):
            return None
        return row[idx]

    def _first_cell(row: tuple[Any, ...], names: tuple[str, ...]) -> Any:
        for name in names:
            value = _cell(row, name)
            if _normalize_text(value):
                return value
        return None

    def _dedupe_key_date(value: date | None) -> date:
        return value if value is not None else date.max

    for row in rows[header_row_idx + 1 :]:
        if not row or all(_normalize_text(x) == "" for x in row):
            continue
        raw_total += 1

        employee_id = _normalize_text(_cell(row, "Employee ID"))
        local_sap_id = _normalize_text(_first_cell(row, LOCAL_SAP_ID_HEADERS)) or None
        employee_name = _normalize_text(_cell(row, "Worker"))
        cost_center_code = _normalize_text(_cell(row, "Cost Center - ID"))
        cost_center_name = _normalize_text(_cell(row, "Cost Center")) or None
        training_name = _normalize_text(_cell(row, "Enrolled Content"))
        start_date = _parse_date(_first_cell(row, START_DATE_HEADERS))
        expiration_date = _parse_date(_cell(row, "Expiration Date"))

        # Business rule: no Required Learning filter. Import both Yes and non-Yes rows.
        # A row without Expiration Date is imported only when Start Date exists; it is then treated as Bezterminowe / indefinite.
        if not expiration_date and not start_date:
            skipped += 1
            continue
        if not employee_id or not employee_name or not cost_center_code or not training_name:
            skipped += 1
            continue

        payload = _ImportedRow(
            employee_id=employee_id,
            local_sap_id=local_sap_id,
            employee_name=employee_name,
            cost_center_code=cost_center_code,
            cost_center_name=cost_center_name,
            training_name=training_name,
            cost_per_person=_parse_decimal(_cell(row, "Cost per Person")),
            completion_status=_normalize_text(_cell(row, "Completion Status")) or None,
            mandatory_training_by=_normalize_text(_cell(row, "Mandatory Training by")) or None,
            start_date=start_date,
            expiration_date=expiration_date,
            source_reference_id=_normalize_text(_cell(row, "Reference ID")) or None,
            source_row_key=_normalize_text(_cell(row, "Learning_Enrollments_ID")) or None,
            source_payload_json=json.dumps(
                {
                    "employee_id": employee_id,
                    "local_sap_id": local_sap_id,
                    "employee_name": employee_name,
                    "cost_center_code": cost_center_code,
                    "training_name": training_name,
                    "start_date": start_date.isoformat() if start_date else None,
                    "expiration_date": expiration_date.isoformat() if expiration_date else None,
                },
                ensure_ascii=False,
            ),
        )

        key = (employee_id.lower(), training_name.lower())
        current = deduped.get(key)
        if current is None:
            deduped[key] = payload
            continue

        current_exp = _dedupe_key_date(current["expiration_date"])
        next_exp = _dedupe_key_date(payload["expiration_date"])
        if next_exp < current_exp:
            deduped[key] = payload
        elif next_exp == current_exp and payload["start_date"] and not current.get("start_date"):
            deduped[key] = payload

    return {
        "rows_total": raw_total,
        "rows_imported": len(deduped),
        "rows_skipped": max(raw_total - len(deduped), skipped),
        "records": list(deduped.values()),
    }


def _decode_csv_bytes(content: bytes) -> str:
    encodings = ("utf-8-sig", "utf-16", "cp1250", "latin-1")
    if content.count(b"\x00") > max(1, len(content) // 20):
        encodings = ("utf-16", "utf-8-sig", "cp1250", "latin-1")

    for encoding in encodings:
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not decode CSV file")


def _parse_csv_rows(file_obj: Any) -> list[tuple[Any, ...]]:
    content = file_obj.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty")

    text = _decode_csv_bytes(content)
    sample = text[:8192]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        reader = csv.reader(io.StringIO(text), dialect)
    except csv.Error:
        delimiter = ","
        if sample.count(";") > sample.count(","):
            delimiter = ";"
        elif sample.count("\t") > sample.count(","):
            delimiter = "\t"
        reader = csv.reader(io.StringIO(text), delimiter=delimiter)

    return [tuple(row) for row in reader]


def _parse_xlsx_rows(file_obj: Any) -> list[tuple[Any, ...]]:
    wb = load_workbook(file_obj, read_only=True, data_only=True)
    ws = wb.active
    return list(ws.iter_rows(values_only=True))


def _parse_workday_file(file_obj: Any, filename: str) -> dict[str, Any]:
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        return _parse_workday_rows(_parse_csv_rows(file_obj))
    return _parse_workday_rows(_parse_xlsx_rows(file_obj))

def _latest_import(db: Session) -> MandatoryTrainingImport | None:
    return db.scalar(select(MandatoryTrainingImport).order_by(MandatoryTrainingImport.imported_at.desc(), MandatoryTrainingImport.id.desc()).limit(1))


def _base_visible_stmt(db: Session, user: User):
    stmt = select(MandatoryTrainingRecord)
    allowed = _visible_area_ids(db, user)
    if allowed is not None:
        if not allowed:
            return stmt.where(False)
        stmt = stmt.where(MandatoryTrainingRecord.area_id.in_(sorted(allowed)))
    return stmt


def _apply_q_and_status(stmt, *, q: str | None, status_value: str, today: date):
    if q:
        qq = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(MandatoryTrainingRecord.employee_name).like(qq),
                func.lower(MandatoryTrainingRecord.employee_id).like(qq),
                func.lower(func.coalesce(MandatoryTrainingRecord.local_sap_id, "")).like(qq),
                func.lower(MandatoryTrainingRecord.training_name).like(qq),
                func.lower(MandatoryTrainingRecord.cost_center_code).like(qq),
                func.lower(func.coalesce(MandatoryTrainingRecord.cost_center_name, "")).like(qq),
            )
        )

    normalized = (status_value or "all").lower()
    if normalized == "expired":
        stmt = stmt.where(MandatoryTrainingRecord.expiration_date.is_not(None), MandatoryTrainingRecord.expiration_date < today)
    elif normalized == "due_7":
        stmt = stmt.where(
            MandatoryTrainingRecord.expiration_date.is_not(None),
            MandatoryTrainingRecord.expiration_date >= today,
            MandatoryTrainingRecord.expiration_date <= today + timedelta(days=7),
        )
    elif normalized == "due_30":
        stmt = stmt.where(
            MandatoryTrainingRecord.expiration_date.is_not(None),
            MandatoryTrainingRecord.expiration_date >= today,
            MandatoryTrainingRecord.expiration_date <= today + timedelta(days=30),
        )
    elif normalized == "indefinite":
        stmt = stmt.where(MandatoryTrainingRecord.expiration_date.is_(None), MandatoryTrainingRecord.start_date.is_not(None))
    elif normalized == "ok":
        stmt = stmt.where(MandatoryTrainingRecord.expiration_date.is_not(None), MandatoryTrainingRecord.expiration_date > today + timedelta(days=30))
    return stmt


def _ordered(stmt):
    return stmt.order_by(
        MandatoryTrainingRecord.expiration_date.asc().nullslast(),
        MandatoryTrainingRecord.employee_name.asc(),
        MandatoryTrainingRecord.training_name.asc(),
        MandatoryTrainingRecord.id.asc(),
    )


def _count_expired(rows: list[MandatoryTrainingRecord], today: date) -> int:
    return sum(1 for x in rows if x.expiration_date is not None and x.expiration_date < today)


def _count_due_7(rows: list[MandatoryTrainingRecord], today: date) -> int:
    return sum(1 for x in rows if x.expiration_date is not None and today <= x.expiration_date <= today + timedelta(days=7))


def _count_due_30(rows: list[MandatoryTrainingRecord], today: date) -> int:
    return sum(1 for x in rows if x.expiration_date is not None and today <= x.expiration_date <= today + timedelta(days=30))


def _count_indefinite(rows: list[MandatoryTrainingRecord]) -> int:
    return sum(1 for x in rows if x.expiration_date is None and x.start_date is not None)


@admin_router.post("/import", response_model=MandatoryTrainingImportSummaryResponse)
def import_mandatory_trainings(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_import_admin(user)

    filename = (file.filename or "").strip() or "mandatory_trainings.xlsx"
    if not filename.lower().endswith((".xlsx", ".csv")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .xlsx and .csv files are supported")

    parsed = _parse_workday_file(file.file, filename=filename)
    cost_centers = db.scalars(select(CostCenter)).all()
    cc_by_code = {_normalize_text(cc.code).lower(): cc for cc in cost_centers if _normalize_text(cc.code)}

    records_to_insert: list[MandatoryTrainingRecord] = []
    unmapped_codes: set[str] = set()

    for row in parsed["records"]:
        cc = cc_by_code.get(_normalize_text(row["cost_center_code"]).lower())
        is_mapped = cc is not None
        area_id = int(cc.area_id) if cc is not None else None
        cost_center_id = int(cc.id) if cc is not None else None
        if not is_mapped:
            unmapped_codes.add(row["cost_center_code"])

        records_to_insert.append(
            MandatoryTrainingRecord(
                employee_id=row["employee_id"],
                local_sap_id=row["local_sap_id"],
                employee_name=row["employee_name"],
                cost_center_code=row["cost_center_code"],
                cost_center_name=row["cost_center_name"],
                cost_center_id=cost_center_id,
                area_id=area_id,
                is_mapped=is_mapped,
                training_name=row["training_name"],
                completion_status=row["completion_status"],
                mandatory_training_by=row["mandatory_training_by"],
                cost_per_person=row["cost_per_person"],
                start_date=row["start_date"],
                expiration_date=row["expiration_date"],
                source_row_key=row["source_row_key"],
                source_reference_id=row["source_reference_id"],
                source_payload_json=row["source_payload_json"],
            )
        )

    db.execute(delete(MandatoryTrainingRecord))
    db.execute(delete(MandatoryTrainingImport))

    import_row = MandatoryTrainingImport(
        filename=filename,
        imported_by_user_id=user.id,
        rows_total=int(parsed["rows_total"]),
        rows_imported=len(records_to_insert),
        rows_skipped=int(parsed["rows_skipped"]),
        rows_unmapped=len(unmapped_codes),
    )
    db.add(import_row)
    db.flush()

    for rec in records_to_insert:
        rec.import_id = import_row.id
        db.add(rec)

    db.commit()
    db.refresh(import_row)
    import_row = _latest_import(db)
    if not import_row:
        raise HTTPException(status_code=500, detail="Import summary not available")

    today = date.today()
    return MandatoryTrainingImportSummaryResponse(
        filename=import_row.filename,
        imported_at=import_row.imported_at,
        imported_by_user_id=import_row.imported_by_user_id,
        imported_by_full_name=(import_row.imported_by.full_name if import_row.imported_by else None),
        rows_total=import_row.rows_total,
        rows_imported=import_row.rows_imported,
        rows_skipped=import_row.rows_skipped,
        rows_unmapped=import_row.rows_unmapped,
        total_records=len(records_to_insert),
        expired_count=_count_expired(records_to_insert, today),
        due_in_7_count=_count_due_7(records_to_insert, today),
        due_in_30_count=_count_due_30(records_to_insert, today),
        indefinite_count=_count_indefinite(records_to_insert),
        unmapped_cost_center_codes=sorted(unmapped_codes),
    )


@admin_router.get("/import-summary", response_model=MandatoryTrainingImportSummaryResponse)
def get_admin_import_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_import_admin(user)
    latest = _latest_import(db)
    if not latest:
        return MandatoryTrainingImportSummaryResponse()

    today = date.today()
    records = db.scalars(select(MandatoryTrainingRecord).where(MandatoryTrainingRecord.import_id == latest.id)).all()
    unmapped_codes = sorted({x.cost_center_code for x in records if not x.is_mapped and x.cost_center_code})
    return MandatoryTrainingImportSummaryResponse(
        filename=latest.filename,
        imported_at=latest.imported_at,
        imported_by_user_id=latest.imported_by_user_id,
        imported_by_full_name=(latest.imported_by.full_name if latest.imported_by else None),
        rows_total=latest.rows_total,
        rows_imported=latest.rows_imported,
        rows_skipped=latest.rows_skipped,
        rows_unmapped=latest.rows_unmapped,
        total_records=len(records),
        expired_count=_count_expired(records, today),
        due_in_7_count=_count_due_7(records, today),
        due_in_30_count=_count_due_30(records, today),
        indefinite_count=_count_indefinite(records),
        unmapped_cost_center_codes=unmapped_codes,
    )


@router.get("", response_model=MandatoryTrainingListResponse)
def list_mandatory_trainings(
    q: str | None = None,
    status_value: str = Query(default="all", alias="status"),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_reader(user)
    today = date.today()

    stmt = _base_visible_stmt(db, user)
    stmt = _apply_q_and_status(stmt, q=q, status_value=status_value, today=today)

    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    items = db.scalars(_ordered(stmt).limit(limit).offset(offset)).all()
    return MandatoryTrainingListResponse(
        items=[_row_to_response(x, today=today) for x in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/summary", response_model=MandatoryTrainingSummaryResponse)
def mandatory_trainings_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_reader(user)
    today = date.today()
    latest = _latest_import(db)

    stmt = _base_visible_stmt(db, user)
    rows = db.scalars(stmt).all()

    return MandatoryTrainingSummaryResponse(
        total=len(rows),
        expired=_count_expired(rows, today),
        due_in_7=_count_due_7(rows, today),
        due_in_30=_count_due_30(rows, today),
        indefinite=_count_indefinite(rows),
        imported_at=(latest.imported_at if latest else None),
        imported_filename=(latest.filename if latest else None),
    )


def _export_status_label(bucket: str, lang: str) -> str:
    labels = {
        "pl": {
            "expired": "Po terminie",
            "due_7": "Do 7 dni",
            "due_30": "Do 30 dni",
            "ok": "Powyżej 30 dni",
            "indefinite": "Bezterminowe",
        },
        "en": {
            "expired": "Expired",
            "due_7": "Within 7 days",
            "due_30": "Within 30 days",
            "ok": "More than 30 days",
            "indefinite": "Indefinite",
        },
    }
    return labels.get(lang, labels["pl"]).get(bucket, bucket)


def _export_days_label(days: int | None, bucket: str, lang: str) -> str:
    if bucket == "indefinite":
        return "Indefinite" if lang == "en" else "Bezterminowe"
    if days is None:
        return "—"
    if days < 0:
        return f"{abs(days)} days overdue" if lang == "en" else f"{abs(days)} dni po terminie"
    if days == 0:
        return "Expires today" if lang == "en" else "Wygasa dzisiaj"
    return f"{days} days" if lang == "en" else f"{days} dni"


@router.get("/export")
def export_mandatory_trainings(
    q: str | None = None,
    status_value: str = Query(default="all", alias="status"),
    lang: str = Query(default="pl"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_reader(user)
    _require_exporter(user)

    lang = (lang or "pl").lower()
    if lang not in {"pl", "en"}:
        lang = "pl"

    today = date.today()
    stmt = _base_visible_stmt(db, user)
    stmt = _apply_q_and_status(stmt, q=q, status_value=status_value, today=today)
    rows = db.scalars(_ordered(stmt)).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Mandatory trainings" if lang == "en" else "Szkolenia obowiązkowe"
    ws.append(EXPORT_HEADERS[lang])

    for row in rows:
        bucket, days = _bucket_for(row.expiration_date, today=today)
        ws.append(
            [
                row.employee_name,
                row.local_sap_id or "",
                row.training_name,
                row.cost_center_code,
                row.cost_center_name or "",
                float(row.cost_per_person) if row.cost_per_person is not None else None,
                row.start_date,
                row.expiration_date,
                _export_days_label(days, bucket, lang),
                _export_status_label(bucket, lang),
                row.completion_status or "",
                row.mandatory_training_by or "",
            ]
        )

    for column_cells in ws.columns:
        max_len = max(len(str(cell.value)) if cell.value is not None else 0 for cell in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = min(max(max_len + 2, 12), 45)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"mandatory_trainings_{today.isoformat()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
