"""merge two heads

Revision ID: 649a08941309
Revises: 4b2a2c1d9a1e, 6862babecf57
Create Date: 2026-02-03 21:50:39.337036

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '649a08941309'
down_revision: Union[str, Sequence[str], None] = ('4b2a2c1d9a1e', '6862babecf57')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
