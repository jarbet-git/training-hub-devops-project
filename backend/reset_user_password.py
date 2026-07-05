from __future__ import annotations

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


# UZUPEŁNIJ
TARGET_EMAIL = "demo@example.com"
NEW_PASSWORD = "demo"


def main() -> None:
    load_dotenv()
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

    with Session(engine) as session:
        user = session.scalar(select(User).where(User.email == TARGET_EMAIL))

        if not user:
            print(f"Nie znaleziono użytkownika: {TARGET_EMAIL}")
            return

        user.password_hash = hash_password(NEW_PASSWORD)
        user.is_active = True
        session.commit()

        print("Hasło zostało zresetowane.")
        print(f"Użytkownik: {user.email}")


if __name__ == "__main__":
    main()