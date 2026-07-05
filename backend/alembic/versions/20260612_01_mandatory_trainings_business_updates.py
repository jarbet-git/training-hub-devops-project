"""mandatory trainings business updates

Revision ID: 20260612_01_mandatory_trainings_business_updates
Revises: 20260320_02_user_mail_notification_preferences
Create Date: 2026-06-12 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260612_01_mandatory_trainings_business_updates"
down_revision = "20260320_02_user_mail_notification_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("mandatory_training_records", sa.Column("local_sap_id", sa.String(length=100), nullable=True))
    op.add_column("mandatory_training_records", sa.Column("start_date", sa.Date(), nullable=True))
    op.alter_column("mandatory_training_records", "expiration_date", existing_type=sa.Date(), nullable=True)
    op.create_index(op.f("ix_mandatory_training_records_local_sap_id"), "mandatory_training_records", ["local_sap_id"], unique=False)
    op.create_index(op.f("ix_mandatory_training_records_start_date"), "mandatory_training_records", ["start_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mandatory_training_records_start_date"), table_name="mandatory_training_records")
    op.drop_index(op.f("ix_mandatory_training_records_local_sap_id"), table_name="mandatory_training_records")
    op.alter_column("mandatory_training_records", "expiration_date", existing_type=sa.Date(), nullable=False)
    op.drop_column("mandatory_training_records", "start_date")
    op.drop_column("mandatory_training_records", "local_sap_id")
