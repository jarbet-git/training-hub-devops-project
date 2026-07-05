from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User

# --- Baza danych ---
SessionDep = Annotated[Session, Depends(get_db)]

# --- Użytkownik ---
CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    """Sprawdza, czy użytkownik jest administratorem."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user


# ---------------------------------------------------------------------------
# Compatibility dependency used by some routers (admin-only)
# ---------------------------------------------------------------------------

def require_admin(current_user: CurrentUser) -> User:
    return get_current_active_superuser(current_user)


def require_hr_or_admin(current_user: CurrentUser) -> User:
    """Allow HR and ADMIN roles."""
    if current_user.role not in (UserRole.ADMIN, UserRole.HR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user
