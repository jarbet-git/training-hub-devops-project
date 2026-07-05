"""add cost_center_id to form_items

Revision ID: e888293131ba
Revises: b7b85b1e6631
Create Date: 2026-02-07 21:12:26.975444
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e888293131ba"
down_revision: Union[str, Sequence[str], None] = "b7b85b1e6631"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) dodaj kolumnę jako NULLABLE (bo masz legacy rekordy)
    op.add_column("form_items", sa.Column("cost_center_id", sa.Integer(), nullable=True))

    # 2) backfill gdzie się da (z forms.cost_center_id)
    op.execute(
        """
        UPDATE form_items fi
        SET cost_center_id = f.cost_center_id
        FROM forms f
        WHERE fi.form_id = f.id
          AND fi.cost_center_id IS NULL
          AND f.cost_center_id IS NOT NULL
        """
    )

    # 3) FK (kolumna może być NULL, FK nadal działa dla wartości != NULL)
    op.create_foreign_key(
        "fk_form_items_cost_center_id_cost_centers",
        "form_items",
        "cost_centers",
        ["cost_center_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # 4) index
    op.create_index("ix_form_items_cost_center_id", "form_items", ["cost_center_id"])


def downgrade() -> None:
    op.drop_index("ix_form_items_cost_center_id", table_name="form_items")
    op.drop_constraint("fk_form_items_cost_center_id_cost_centers", "form_items", type_="foreignkey")
    op.drop_column("form_items", "cost_center_id")
