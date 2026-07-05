from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User

DEMO_EMAIL = "demo@example.com"
DEMO_LOGIN = "demo"
DEMO_PASSWORD = "demo"


def upsert_demo_user(session: Session) -> User:
    user = session.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user is None:
        user = User(email=DEMO_EMAIL, full_name="Demo User", password_hash=hash_password(DEMO_PASSWORD))
        session.add(user)
        session.flush()

    user.full_name = "Demo User"
    user.password_hash = hash_password(DEMO_PASSWORD)
    user.role = "ADMIN"
    user.is_active = True
    user.is_pending_activation = False
    user.preferred_language = "en"
    return user


def main() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path)

    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with Session(engine) as session:
        upsert_demo_user(session)
        session.commit()

    print(f"Demo account ready: login={DEMO_LOGIN}, email={DEMO_EMAIL}, password={DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
