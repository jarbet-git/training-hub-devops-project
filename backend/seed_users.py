from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def upsert_user(session: Session, email: str, full_name: str, password: str, role: str) -> User:
    user = session.scalar(select(User).where(User.email == email))
    if user:
        user.full_name = full_name
        user.role = role
        user.is_active = True
        user.is_pending_activation = False
        user.password_hash = hash_password(password)
        return user

    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
        is_pending_activation=False,
    )
    session.add(user)
    session.flush()
    return user


def main() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path)

    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with Session(engine) as session:
        upsert_user(session, "demo@example.com", "Demo User", "demo", "ADMIN")
        upsert_user(session, "manager@example.com", "Example Manager", "Manager1234!", "MANAGER")
        upsert_user(session, "hr@example.com", "Example HR", "HR1234!", "HR")
        upsert_user(session, "editor@example.com", "Example Editor", "Editor1234!", "EDITOR")
        session.commit()

    print("Seed users completed OK.")


if __name__ == "__main__":
    main()
