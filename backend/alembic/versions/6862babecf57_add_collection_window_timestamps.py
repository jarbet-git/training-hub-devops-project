"""add collection_window timestamps

Revision ID: 6862babecf57
Revises: 71bd40ba6427
Create Date: 2026-01-29 11:04:49.151166

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6862babecf57'
down_revision: Union[str, Sequence[str], None] = '71bd40ba6427'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) dodaj kolumny z server_default żeby Postgres mógł je wypełnić dla istniejących wierszy
    op.add_column(
        "collection_windows",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.add_column(
        "collection_windows",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 2) backfill (na wypadek gdyby server_default nie zadziałał w jakimś scenariuszu)
    op.execute("UPDATE collection_windows SET created_at = now() WHERE created_at IS NULL")
    op.execute("UPDATE collection_windows SET updated_at = now() WHERE updated_at IS NULL")

    # 3) (opcjonalnie) usuń server_default żeby wartości pochodziły z aplikacji/onupdate
    op.alter_column("collection_windows", "created_at", server_default=None)
    op.alter_column("collection_windows", "updated_at", server_default=None)


def downgrade() -> None:
    op.drop_column("collection_windows", "updated_at")
    op.drop_column("collection_windows", "created_at")
