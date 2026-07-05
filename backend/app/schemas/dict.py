from pydantic import BaseModel


class DictItem(BaseModel):
    id: int
    code: str | None = None
    name_pl: str | None = None
    name_en: str | None = None
    # Optional metadata for certain dictionaries
    category_id: int | None = None
    default_cost_per_person: float | None = None
    default_hours_per_person: float | None = None
