from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.area import Area
from app.models.cost_center import CostCenter
from app.models.training_category import TrainingCategory
from app.models.training_name import TrainingName
from app.models.business_need import BusinessNeed
from app.models.collection_window import CollectionWindow


def upsert_area(
    session: Session,
    code: str,
    name_pl: str | None = None,
    name_en: str | None = None,
) -> Area:
    area = session.scalar(select(Area).where(Area.code == code))
    if area:
        area.name_pl = name_pl
        area.name_en = name_en
        return area

    area = Area(code=code, name_pl=name_pl, name_en=name_en)
    session.add(area)
    session.flush()
    return area


def upsert_cost_center(
    session: Session,
    area: Area,
    code: str,
    name_pl: str | None = None,
    name_en: str | None = None,
) -> CostCenter:
    cc = session.scalar(select(CostCenter).where(CostCenter.area_id == area.id, CostCenter.code == code))
    if cc:
        cc.name_pl = name_pl
        cc.name_en = name_en
        return cc

    cc = CostCenter(area_id=area.id, code=code, name_pl=name_pl, name_en=name_en)
    session.add(cc)
    session.flush()
    return cc


def upsert_category(session: Session, name_pl: str, name_en: str) -> TrainingCategory:
    cat = session.scalar(select(TrainingCategory).where(TrainingCategory.name_pl == name_pl))
    if cat:
        cat.name_en = name_en
        return cat

    cat = TrainingCategory(name_pl=name_pl, name_en=name_en)
    session.add(cat)
    session.flush()
    return cat


def upsert_training(
    session: Session,
    cat: TrainingCategory,
    name_pl: str,
    name_en: str,
) -> TrainingName:
    tr = session.scalar(
        select(TrainingName).where(
            TrainingName.category_id == cat.id,
            TrainingName.name_pl == name_pl,
        )
    )
    if tr:
        tr.name_en = name_en
        return tr

    tr = TrainingName(category_id=cat.id, name_pl=name_pl, name_en=name_en)
    session.add(tr)
    session.flush()
    return tr


def upsert_need(session: Session, name_pl: str, name_en: str) -> BusinessNeed:
    n = session.scalar(select(BusinessNeed).where(BusinessNeed.name_pl == name_pl))
    if n:
        n.name_en = name_en
        return n

    n = BusinessNeed(name_pl=name_pl, name_en=name_en)
    session.add(n)
    session.flush()
    return n


def ensure_collection_window(session: Session, is_open: bool = True) -> CollectionWindow:
    """Keep exactly one row in the collection_windows table."""
    win = session.scalar(select(CollectionWindow).order_by(CollectionWindow.id).limit(1))
    if not win:
        win = CollectionWindow(is_open=is_open)
        session.add(win)
        session.flush()
        return win

    win.is_open = is_open
    return win


def main() -> None:
    # Load .env reliably regardless of the current working directory
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path)

    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

    with Session(engine) as session:
        # --- AREAS + COST CENTERS (demo data for Betcloud) ---
        operations = upsert_area(session, "OPS", "Operacje", "Operations")
        upsert_cost_center(session, operations, "CC1001", "Produkcja", "Production")
        upsert_cost_center(session, operations, "CC1002", "Utrzymanie ruchu", "Maintenance")

        support = upsert_area(session, "SUPPORT", "Wsparcie", "Support")
        upsert_cost_center(session, support, "CC2001", "HR", "HR")
        upsert_cost_center(session, support, "CC2002", "IT", "IT")

        # --- CATEGORIES + TRAININGS ---
        cat_soft = upsert_category(session, "Kompetencje miękkie", "Soft skills")
        upsert_training(session, cat_soft, "Komunikacja i współpraca", "Communication & collaboration")
        upsert_training(session, cat_soft, "Zarządzanie czasem", "Time management")

        cat_it = upsert_category(session, "Szkolenia informatyczne", "IT trainings")
        upsert_training(session, cat_it, "Excel zaawansowany", "Advanced Excel")
        upsert_training(session, cat_it, "Power BI", "Power BI")

        cat_studies = upsert_category(session, "Studia", "Studies")
        upsert_training(session, cat_studies, "Studia licencjackie", "Bachelor studies")
        upsert_training(session, cat_studies, "Studia inżynierskie", "Engineering studies")

        # --- BUSINESS NEEDS ---
        upsert_need(session, "Poprawa wydajności", "Increase efficiency")
        upsert_need(session, "Utrzymanie potencjału", "Maintain capability")
        upsert_need(session, "Zmniejszenie kosztów", "Reduce costs")

        # --- COLLECTION WINDOW (single row) ---
        ensure_collection_window(session, is_open=True)

        session.commit()

    print("Seed completed OK.")


if __name__ == "__main__":
    main()
