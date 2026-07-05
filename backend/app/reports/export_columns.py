from __future__ import annotations

from typing import Dict, List, Tuple


# Column keys used by backend and presets.
# NOTE: Order matters for presets.

COLUMN_DEFS: Dict[str, Dict[str, str]] = {
    "area": {"pl": "Obszar", "en": "Area"},
    "mpk": {"pl": "MPK", "en": "Cost center"},
    "training": {"pl": "Szkolenie", "en": "Training"},
    "category": {"pl": "Kategoria", "en": "Category"},
    "business_need": {"pl": "Potrzeba biznesowa", "en": "Business need"},
    "employees_count": {"pl": "Liczba osób", "en": "Employees"},
    "cost_per_person": {"pl": "Koszt/os. (PLN)", "en": "Cost/person (PLN)"},
    "total_cost": {"pl": "Koszt całk. (PLN)", "en": "Total cost (PLN)"},
    "hours_per_person": {"pl": "Godziny/os. (h)", "en": "Hours/person (h)"},
    "total_hours": {"pl": "Godziny całk. (h)", "en": "Total hours (h)"},
    "quarter": {"pl": "Kwartał", "en": "Quarter"},
    "priority": {"pl": "Priorytet", "en": "Priority"},
    "employee": {"pl": "Pracownik", "en": "Employee"},
    "contact_person": {"pl": "Osoba kontaktowa", "en": "Contact person"},
    "notes": {"pl": "Uwagi", "en": "Notes"},
    "form_status": {"pl": "Status wniosku", "en": "Form status"},
    "hr_decision": {"pl": "Decyzja HR", "en": "HR decision"},
    "hr_budget_total": {"pl": "Budżet HR (PLN)", "en": "HR budget (PLN)"},
    "hr_comment": {"pl": "Komentarz HR", "en": "HR comment"},
    "created_at": {"pl": "Utworzono", "en": "Created"},
}


DEFAULT_COLUMNS_V1: List[str] = [
    "area",
    "mpk",
    "training",
    "category",
    "business_need",
    "employees_count",
    "cost_per_person",
    "total_cost",
    "hours_per_person",
    "total_hours",
    "quarter",
    "priority",
    "employee",
    "contact_person",
    "notes",
    "form_status",
    "hr_decision",
    "hr_budget_total",
    "hr_comment",
    "created_at",
]

# A ready-to-use preset matching typical AFC Excel expectations.
DEFAULT_COLUMNS_AFC: List[str] = [
    "mpk",
    "training",
    "category",
    "business_need",
    "employees_count",
    "cost_per_person",
    "total_cost",
    "hours_per_person",
    "total_hours",
    "quarter",
    "priority",
    "employee",
    "contact_person",
    "notes",
    "form_status",
    "hr_decision",
    "hr_budget_total",
    "hr_comment",
    "created_at",
]


def normalize_columns(cols: List[str]) -> List[str]:
    out: List[str] = []
    seen = set()
    for c in cols:
        c = (c or "").strip()
        if not c:
            continue
        if c not in COLUMN_DEFS:
            raise ValueError(f"Invalid column: {c}")
        if c in seen:
            continue
        seen.add(c)
        out.append(c)
    if not out:
        raise ValueError("At least one column is required")
    return out


def headers_for(columns: List[str], lang: str) -> List[str]:
    lang = (lang or "pl").lower()
    if lang not in ("pl", "en"):
        lang = "pl"
    return [COLUMN_DEFS[c][lang] for c in columns]


def header_of(column_key: str, lang: str) -> str:
    lang = (lang or "pl").lower()
    if lang not in ("pl", "en"):
        lang = "pl"
    return COLUMN_DEFS[column_key][lang]


SUMMARY_HEADERS: Dict[str, Dict[str, str]] = {
    "form_id": {"pl": "Wniosek ID", "en": "Form ID"},
    "area": {"pl": "Obszar", "en": "Area"},
    "mpk_in_items": {"pl": "MPK (w pozycjach)", "en": "Cost centers (items)"},
    "status": {"pl": "Status", "en": "Status"},
    "created_at": {"pl": "Utworzono", "en": "Created"},
    "sum_cost": {"pl": "Suma koszt (PLN)", "en": "Sum cost (PLN)"},
    "sum_hours": {"pl": "Suma godzin (h)", "en": "Sum hours (h)"},
    "hr_decision": {"pl": "Decyzja HR", "en": "HR decision"},
    "hr_budget_total": {"pl": "Budżet HR (PLN)", "en": "HR budget (PLN)"},
    "hr_comment": {"pl": "Komentarz HR", "en": "HR comment"},
}


def summary_headers(lang: str) -> List[str]:
    lang = (lang or "pl").lower()
    if lang not in ("pl", "en"):
        lang = "pl"
    keys = [
        "form_id",
        "area",
        "mpk_in_items",
        "status",
        "created_at",
        "sum_cost",
        "sum_hours",
        "hr_decision",
        "hr_budget_total",
        "hr_comment",
    ]
    return [SUMMARY_HEADERS[k][lang] for k in keys]


def summary_row(lang: str, **kwargs) -> Dict[str, object]:
    """Build a translated summary row for sheet 'Wnioski'."""
    lang = (lang or "pl").lower()
    if lang not in ("pl", "en"):
        lang = "pl"
    return {
        SUMMARY_HEADERS["form_id"][lang]: kwargs.get("form_id"),
        SUMMARY_HEADERS["area"][lang]: kwargs.get("area"),
        SUMMARY_HEADERS["mpk_in_items"][lang]: kwargs.get("mpk_in_items"),
        SUMMARY_HEADERS["status"][lang]: kwargs.get("status"),
        SUMMARY_HEADERS["created_at"][lang]: kwargs.get("created_at"),
        SUMMARY_HEADERS["sum_cost"][lang]: kwargs.get("sum_cost"),
        SUMMARY_HEADERS["sum_hours"][lang]: kwargs.get("sum_hours"),
        SUMMARY_HEADERS["hr_decision"][lang]: kwargs.get("hr_decision"),
        SUMMARY_HEADERS["hr_budget_total"][lang]: kwargs.get("hr_budget_total"),
        SUMMARY_HEADERS["hr_comment"][lang]: kwargs.get("hr_comment"),
    }
