"""merge stage7 pro heads

Revision ID: 20260214_01_merge_stage7_pro_heads
Revises: 20260210_01_hr_reply, c9f2d1a0b3d2
Create Date: 2026-02-14

"""

from __future__ import annotations

from typing import Sequence

from alembic import op  # noqa: F401

# revision identifiers, used by Alembic.
revision = '20260214_01_merge_stage7'
down_revision: str | Sequence[str] | None = ("20260210_01_hr_reply", "c9f2d1a0b3d2")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # This is a merge migration to resolve multiple heads.
    pass


def downgrade() -> None:
    # Downgrading a merge just drops the merge point.
    pass
