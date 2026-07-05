"""Application enums.

Central place for API- and DB-facing enums.

We keep them as ``str, Enum`` so:
 - Pydantic serializes them nicely
 - SQLAlchemy can store them as plain strings (VARCHAR)
 - comparisons remain straightforward
"""

from __future__ import annotations

from enum import Enum


class UserRole(str, Enum):
    EDITOR = "EDITOR"
    MANAGER = "MANAGER"
    HR = "HR"
    ADMIN = "ADMIN"


class FormStatus(str, Enum):
    DRAFT = "DRAFT"
    MANAGER_REVIEW = "MANAGER_REVIEW"
    HR_REVIEW = "HR_REVIEW"
    # HR odpowiedziało decyzją końcową (APPROVED albo REJECTED).
    # Status REPLIED oznacza koniec procesu i brak dalszej edycji.
    # Cofnięcie do poprawki NIE jest decyzją końcową HR — wraca do MANAGER_REVIEW.
    REPLIED = "REPLIED"
    CLOSED = "CLOSED"


class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Quarter(str, Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"
    TBD = "TBD"  # nieustalony kwartał


class HrDecision(str, Enum):
    APPROVED = "APPROVED"
    PARTIAL = "PARTIAL"  # deprecated: zostaje tylko dla kompatybilności historycznych danych/API
    REJECTED = "REJECTED"


class TrainingProposalStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    LINKED = "LINKED"
    REJECTED = "REJECTED"
