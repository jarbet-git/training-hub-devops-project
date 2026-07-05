from __future__ import annotations

from dotenv import dotenv_values, load_dotenv
from pathlib import Path
import os
import sys
import psycopg


def normalize_psycopg_url(url: str | None) -> str | None:
    """
    Convert SQLAlchemy-style URL to a psycopg-compatible URL.
    Example:
      postgresql+psycopg://user:pass@host/db -> postgresql://user:pass@host/db
    """
    if not url:
        return None
    if url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql+psycopg://", "postgresql://", 1)
    return url


def main() -> int:
    # Load .env from backend directory (current working dir)
    env_path = Path(".env").resolve()

    print("ENV PATH:", env_path)
    if not env_path.exists():
        print("❌ .env file not found at:", env_path)
        print("Tip: run this script from the backend folder where .env exists.")
        return 1

    print("ENV VALUES:", dotenv_values(env_path))

    ok = load_dotenv(env_path, override=True)
    print("load_dotenv:", ok)

    raw_url = os.getenv("DATABASE_URL")
    print("DATABASE_URL (raw):", raw_url)

    url = normalize_psycopg_url(raw_url)
    print("DATABASE_URL (psycopg):", url)

    if not url:
        print("❌ DATABASE_URL is missing/empty in .env")
        return 2

    try:
        # Connect and verify DB access
        with psycopg.connect(url) as conn:
            with conn.cursor() as cur:
                cur.execute("select current_database(), version()")
                db, ver = cur.fetchone()
                print("✅ Connected OK")
                print("DB:", db)
                print("PostgreSQL:", ver)
        return 0

    except Exception as e:
        print("❌ Connection failed!")
        print("Error type:", type(e).__name__)
        print("Error:", e)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
