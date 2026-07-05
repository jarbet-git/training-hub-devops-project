from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import delete, select, func, text as sql_text  # noqa: E402

from app.core.database import SessionLocal, engine, Base  # noqa: E402
import app.models  # noqa: F401,E402  # ensure models are registered in Base.metadata
from app.models.user import User  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Delete all Training Hub data except one ADMIN account.",
    )
    parser.add_argument("--admin-email", required=True, help="Email of the ADMIN account to keep.")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Execute destructive cleanup. Without this flag the script only prints what it would do.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    with SessionLocal() as db:
        admin = db.scalar(select(User).where(func.lower(User.email) == args.admin_email.strip().lower()))
        if not admin:
            print(f"ERROR: user '{args.admin_email}' was not found.")
            return 1
        if (admin.role or "").upper() != "ADMIN":
            print(f"ERROR: user '{admin.email}' exists, but is not an ADMIN (role={admin.role!r}).")
            return 1

        print("This script will remove all database data except the selected ADMIN account:")
        print(f"  keep user id={admin.id}, email={admin.email}, full_name={admin.full_name}, role={admin.role}")
        print()

        all_tables = [table.name for table in Base.metadata.sorted_tables]
        print("Tables registered in metadata:")
        for name in all_tables:
            print(f"  - {name}")
        print()

        if not args.yes:
            print("Dry run only. Re-run with --yes to perform the cleanup.")
            return 0

        admin.area_id = None
        db.flush()

        for table in reversed(Base.metadata.sorted_tables):
            if table.name == "users":
                db.execute(delete(table).where(table.c.id != admin.id))
            elif table.name == "user_area_access":
                db.execute(delete(table))
            else:
                db.execute(delete(table))

        db.commit()

    # Optional sequence reset for PostgreSQL tables with integer id columns.
    # Safe to ignore if the DB is not PostgreSQL.
    try:
        with engine.begin() as conn:
            dialect = conn.dialect.name
            if dialect == "postgresql":
                for table in Base.metadata.sorted_tables:
                    if "id" not in table.c:
                        continue
                    seq = conn.execute(
                        sql_text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                        {"table_name": table.name},
                    ).scalar()
                    if not seq:
                        continue
                    max_id = conn.execute(select(func.max(table.c.id))).scalar() or 1
                    conn.execute(sql_text("SELECT setval(:seq_name, :new_value, true)"), {"seq_name": seq, "new_value": int(max_id)})
    except Exception as exc:  # pragma: no cover
        print(f"WARNING: cleanup succeeded, but sequence reset was skipped: {exc}")

    print("Cleanup finished successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
