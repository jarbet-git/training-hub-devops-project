"""add export presets

Revision ID: c9f2d1a0b3d2
Revises: b7b85b1e6631
Create Date: 2026-02-14

"""

from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "c9f2d1a0b3d2"
down_revision = "b7b85b1e6631"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "export_presets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("columns", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_index("ix_export_presets_id", "export_presets", ["id"], unique=False)
    op.create_index("ix_export_presets_name", "export_presets", ["name"], unique=False)

    # Seed a system preset: "Układ dla AFC" (shared)
    now = datetime.utcnow()
    presets_table = sa.table(
        "export_presets",
        sa.column("name", sa.String()),
        sa.column("columns", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("created_by_user_id", sa.Integer()),
        sa.column("is_shared", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )

    op.bulk_insert(
        presets_table,
        [
            {
                "name": "Układ dla AFC",
                "columns": [
                    "mpk",
                    "training",
                    "category",
                    "business_need",
                    "employees_count",
                    "cost_per_person",
                    "total_cost",
                    "hours_per_person",
                    "total_hours",
                    "quarter",
                    "priority",
                    "employee",
                    "contact_person",
                    "notes",
                    "form_status",
                    "hr_decision",
                    "hr_budget_total",
                    "hr_comment",
                    "created_at",
                ],
                "created_by_user_id": None,
                "is_shared": True,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_export_presets_name", table_name="export_presets")
    op.drop_index("ix_export_presets_id", table_name="export_presets")
    op.drop_table("export_presets")
