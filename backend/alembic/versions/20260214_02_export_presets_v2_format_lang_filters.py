"""export presets v2 (format/lang/filters) + remove AFC system preset

Revision ID: 20260214_02_export_presets_v2
Revises: 20260214_01_merge_stage7
Create Date: 2026-02-14

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260214_02_export_presets_v2"
down_revision = "20260214_01_merge_stage7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add export preferences to presets
    op.add_column("export_presets", sa.Column("export_format", sa.String(length=8), nullable=False, server_default=sa.text("'xlsx'")))
    op.add_column("export_presets", sa.Column("export_lang", sa.String(length=2), nullable=False, server_default=sa.text("'pl'")))
    op.add_column("export_presets", sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Remove seeded system preset (user wants to create it manually)
    op.execute(
        sa.text(
            "DELETE FROM export_presets WHERE created_by_user_id IS NULL AND name = :name"
        ).bindparams(name="Układ dla AFC")
    )

    # Drop server defaults (keep app-level defaults)
    op.alter_column("export_presets", "export_format", server_default=None)
    op.alter_column("export_presets", "export_lang", server_default=None)


def downgrade() -> None:
    op.drop_column("export_presets", "filters")
    op.drop_column("export_presets", "export_lang")
    op.drop_column("export_presets", "export_format")
