"""training proposals and notifications support

Revision ID: 20260311_01_train_props
Revises: 20260215_01_fix_form_items_quarter_len
Create Date: 2026-03-11 22:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20260311_01_train_props'
down_revision = '20260215_01_fix_form_items_quarter_len'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'training_name_proposals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('name_en', sa.String(length=200), nullable=True),
        sa.Column('justification', sa.Text(), nullable=False),
        sa.Column('suggested_category_id', sa.Integer(), nullable=True),
        sa.Column('provider', sa.String(length=200), nullable=True),
        sa.Column('external_url', sa.String(length=500), nullable=True),
        sa.Column('estimated_cost_per_person', sa.Numeric(12,2), nullable=True),
        sa.Column('estimated_hours_per_person', sa.Numeric(8,2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='SUBMITTED'),
        sa.Column('requester_user_id', sa.Integer(), nullable=False),
        sa.Column('requester_role', sa.String(length=30), nullable=False),
        sa.Column('form_id', sa.Integer(), nullable=True),
        sa.Column('review_comment', sa.Text(), nullable=True),
        sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('linked_training_name_id', sa.Integer(), nullable=True),
        sa.Column('approved_training_name_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['suggested_category_id'], ['training_categories.id']),
        sa.ForeignKeyConstraint(['requester_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['form_id'], ['forms.id']),
        sa.ForeignKeyConstraint(['reviewed_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['linked_training_name_id'], ['training_names.id']),
        sa.ForeignKeyConstraint(['approved_training_name_id'], ['training_names.id']),
    )
    op.create_index(op.f('ix_training_name_proposals_status'), 'training_name_proposals', ['status'], unique=False)
    op.create_index(op.f('ix_training_name_proposals_requester_user_id'), 'training_name_proposals', ['requester_user_id'], unique=False)
    op.create_index(op.f('ix_training_name_proposals_suggested_category_id'), 'training_name_proposals', ['suggested_category_id'], unique=False)
    op.create_index(op.f('ix_training_name_proposals_form_id'), 'training_name_proposals', ['form_id'], unique=False)
    op.create_index(op.f('ix_training_name_proposals_reviewed_by_user_id'), 'training_name_proposals', ['reviewed_by_user_id'], unique=False)
    op.create_index(op.f('ix_training_name_proposals_linked_training_name_id'), 'training_name_proposals', ['linked_training_name_id'], unique=False)
    op.create_index(op.f('ix_training_name_proposals_approved_training_name_id'), 'training_name_proposals', ['approved_training_name_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_training_name_proposals_approved_training_name_id'), table_name='training_name_proposals')
    op.drop_index(op.f('ix_training_name_proposals_linked_training_name_id'), table_name='training_name_proposals')
    op.drop_index(op.f('ix_training_name_proposals_reviewed_by_user_id'), table_name='training_name_proposals')
    op.drop_index(op.f('ix_training_name_proposals_form_id'), table_name='training_name_proposals')
    op.drop_index(op.f('ix_training_name_proposals_suggested_category_id'), table_name='training_name_proposals')
    op.drop_index(op.f('ix_training_name_proposals_requester_user_id'), table_name='training_name_proposals')
    op.drop_index(op.f('ix_training_name_proposals_status'), table_name='training_name_proposals')
    op.drop_table('training_name_proposals')
