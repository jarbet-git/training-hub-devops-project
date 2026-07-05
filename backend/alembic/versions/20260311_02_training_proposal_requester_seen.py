"""track requester visibility for reviewed training proposals

Revision ID: 20260311_02_training_proposal_requester_seen
Revises: 20260311_01_train_props
Create Date: 2026-03-11 22:30:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20260311_02_training_proposal_requester_seen'
down_revision = '20260311_01_train_props'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('training_name_proposals', sa.Column('requester_seen_reviewed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('training_name_proposals', 'requester_seen_reviewed_at')
