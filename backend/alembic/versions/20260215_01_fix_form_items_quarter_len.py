"""Fix form_items.quarter length (allow TBD)

Revision ID: 20260215_01_fix_form_items_quarter_len
Revises: 20260214_02_export_presets_v2
Create Date: 2026-02-15

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260215_01_fix_form_items_quarter_len"
down_revision = "20260214_02_export_presets_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Expand Alembic version column because descriptive revision ids can be longer than 32 characters.
    # PostgreSQL enforces the default VARCHAR(32) limit, while SQLite does not need this change.
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)")

    # quarter values are: Q1..Q4 or TBD (3 chars)
    op.alter_column(
        "form_items",
        "quarter",
        existing_type=sa.String(length=2),
        type_=sa.String(length=3),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Downgrade safety: ensure values fit into length 2.
    op.execute("UPDATE form_items SET quarter = 'Q1' WHERE length(quarter) > 2")
    op.alter_column(
        "form_items",
        "quarter",
        existing_type=sa.String(length=3),
        type_=sa.String(length=2),
        existing_nullable=False,
    )
