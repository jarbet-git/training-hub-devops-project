"""add hr_decision and hr_comment to form_items

Revision ID: 2f0b2f7d0b7e
Revises: e888293131ba
Create Date: 2026-02-07

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2f0b2f7d0b7e"
down_revision = "e888293131ba"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("form_items", sa.Column("hr_decision", sa.String(length=20), nullable=True))
    op.add_column("form_items", sa.Column("hr_comment", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("form_items", "hr_comment")
    op.drop_column("form_items", "hr_decision")
