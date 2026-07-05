"""add user_area_access

Revision ID: 4b2a2c1d9a1e
Revises: e5a965ac55e8
Create Date: 2026-02-03

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "4b2a2c1d9a1e"
down_revision: Union[str, Sequence[str], None] = "e5a965ac55e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_area_access",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("area_id", sa.Integer(), sa.ForeignKey("areas.id", ondelete="CASCADE"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "area_id"),
        sa.UniqueConstraint("user_id", "area_id", name="uq_user_area_access"),
    )

    # Backfill: if a user has legacy area_id set, grant access to that area
    op.execute(
        sa.text(
            """
            INSERT INTO user_area_access (user_id, area_id)
            SELECT id AS user_id, area_id
            FROM users
            WHERE area_id IS NOT NULL
            ON CONFLICT DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_table("user_area_access")
