"""add user_areas association table

Revision ID: 20260204_01_add_user_areas
Revises: 6862babecf57
Create Date: 2026-02-04

"""

from alembic import op
import sqlalchemy as sa

revision = "20260204_01_add_user_areas"
down_revision = "6862babecf57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_areas",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "area_id",
            sa.Integer(),
            sa.ForeignKey("areas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "area_id", name="uq_user_areas_user_area"),
    )
    op.create_index("ix_user_areas_user_id", "user_areas", ["user_id"], unique=False)
    op.create_index("ix_user_areas_area_id", "user_areas", ["area_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_areas_area_id", table_name="user_areas")
    op.drop_index("ix_user_areas_user_id", table_name="user_areas")
    op.drop_table("user_areas")
