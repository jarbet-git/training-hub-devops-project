"""mandatory trainings import module

Revision ID: 20260315_01_mandatory_trainings
Revises: 20260311_02_training_proposal_requester_seen
Create Date: 2026-03-15 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20260315_01_mandatory_trainings'
down_revision = '20260311_02_training_proposal_requester_seen'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mandatory_training_imports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('filename', sa.String(length=500), nullable=False),
        sa.Column('imported_by_user_id', sa.Integer(), nullable=False),
        sa.Column('imported_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('rows_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rows_imported', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rows_skipped', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rows_unmapped', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['imported_by_user_id'], ['users.id'], ondelete='RESTRICT'),
    )
    op.create_index(op.f('ix_mandatory_training_imports_imported_by_user_id'), 'mandatory_training_imports', ['imported_by_user_id'], unique=False)

    op.create_table(
        'mandatory_training_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('import_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.String(length=100), nullable=False),
        sa.Column('employee_name', sa.String(length=255), nullable=False),
        sa.Column('cost_center_code', sa.String(length=100), nullable=False),
        sa.Column('cost_center_name', sa.String(length=255), nullable=True),
        sa.Column('cost_center_id', sa.Integer(), nullable=True),
        sa.Column('area_id', sa.Integer(), nullable=True),
        sa.Column('is_mapped', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('training_name', sa.String(length=500), nullable=False),
        sa.Column('completion_status', sa.String(length=100), nullable=True),
        sa.Column('mandatory_training_by', sa.String(length=255), nullable=True),
        sa.Column('cost_per_person', sa.Numeric(12, 2), nullable=True),
        sa.Column('expiration_date', sa.Date(), nullable=False),
        sa.Column('source_row_key', sa.String(length=255), nullable=True),
        sa.Column('source_reference_id', sa.String(length=255), nullable=True),
        sa.Column('source_payload_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['import_id'], ['mandatory_training_imports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cost_center_id'], ['cost_centers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_mandatory_training_records_import_id'), 'mandatory_training_records', ['import_id'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_employee_id'), 'mandatory_training_records', ['employee_id'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_employee_name'), 'mandatory_training_records', ['employee_name'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_cost_center_code'), 'mandatory_training_records', ['cost_center_code'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_cost_center_id'), 'mandatory_training_records', ['cost_center_id'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_area_id'), 'mandatory_training_records', ['area_id'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_is_mapped'), 'mandatory_training_records', ['is_mapped'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_training_name'), 'mandatory_training_records', ['training_name'], unique=False)
    op.create_index(op.f('ix_mandatory_training_records_expiration_date'), 'mandatory_training_records', ['expiration_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_mandatory_training_records_expiration_date'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_training_name'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_is_mapped'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_area_id'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_cost_center_id'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_cost_center_code'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_employee_name'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_employee_id'), table_name='mandatory_training_records')
    op.drop_index(op.f('ix_mandatory_training_records_import_id'), table_name='mandatory_training_records')
    op.drop_table('mandatory_training_records')

    op.drop_index(op.f('ix_mandatory_training_imports_imported_by_user_id'), table_name='mandatory_training_imports')
    op.drop_table('mandatory_training_imports')
