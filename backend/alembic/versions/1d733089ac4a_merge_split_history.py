"""merge split history

Revision ID: 1d733089ac4a
Revises: 20260204_01_add_user_areas, 649a08941309
Create Date: 2026-02-07 16:12:33.768277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d733089ac4a'
down_revision: Union[str, Sequence[str], None] = ('20260204_01_add_user_areas', '649a08941309')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
