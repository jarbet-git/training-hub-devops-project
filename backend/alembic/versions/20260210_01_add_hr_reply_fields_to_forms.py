"""add hr reply fields to forms

Revision ID: 20260210_01_hr_reply
Revises: 4c3a1d2e0f11
Create Date: 2026-02-10

"""

from alembic import op
import sqlalchemy as sa

revision = "20260210_01_hr_reply"
down_revision = "4c3a1d2e0f11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("forms", sa.Column("hr_budget_total", sa.Numeric(12, 2), nullable=True))
    op.add_column("forms", sa.Column("hr_decision", sa.String(length=20), nullable=True))
    op.add_column("forms", sa.Column("hr_comment", sa.Text(), nullable=True))
    op.create_index(op.f("ix_forms_hr_decision"), "forms", ["hr_decision"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_forms_hr_decision"), table_name="forms")
    op.drop_column("forms", "hr_comment")
    op.drop_column("forms", "hr_decision")
    op.drop_column("forms", "hr_budget_total")
