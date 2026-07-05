"""add defaults to training names

Revision ID: 4c3a1d2e0f11
Revises: 2f0b2f7d0b7e
Create Date: 2026-02-09 00:00:00

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4c3a1d2e0f11"
down_revision = "2f0b2f7d0b7e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "training_names",
        sa.Column(
            "default_cost_per_person",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "training_names",
        sa.Column(
            "default_hours_per_person",
            sa.Numeric(8, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("training_names", "default_hours_per_person")
    op.drop_column("training_names", "default_cost_per_person")
