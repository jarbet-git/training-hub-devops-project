"""add user mail notification preferences

Revision ID: 20260320_02_user_mail_notification_preferences
Revises: 20260320_01_account_activation_invites
Create Date: 2026-03-20

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260320_02_user_mail_notification_preferences"
down_revision = "20260320_01_account_activation_invites"
branch_labels = None
depends_on = None


def _get_columns(bind, table_name: str) -> set[str]:
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    user_columns = _get_columns(bind, "users")

    if "email_notifications_hr_response" not in user_columns:
        op.add_column("users", sa.Column("email_notifications_hr_response", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "email_notifications_proposal_review" not in user_columns:
        op.add_column("users", sa.Column("email_notifications_proposal_review", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "email_notifications_weekly_mandatory_digest" not in user_columns:
        op.add_column("users", sa.Column("email_notifications_weekly_mandatory_digest", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "last_weekly_mandatory_digest_sent_at" not in user_columns:
        op.add_column("users", sa.Column("last_weekly_mandatory_digest_sent_at", sa.DateTime(timezone=True), nullable=True))

    for col in (
        "email_notifications_hr_response",
        "email_notifications_proposal_review",
        "email_notifications_weekly_mandatory_digest",
    ):
        try:
            op.alter_column("users", col, server_default=None)
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    user_columns = _get_columns(bind, "users")

    if "last_weekly_mandatory_digest_sent_at" in user_columns:
        op.drop_column("users", "last_weekly_mandatory_digest_sent_at")
    if "email_notifications_weekly_mandatory_digest" in user_columns:
        op.drop_column("users", "email_notifications_weekly_mandatory_digest")
    if "email_notifications_proposal_review" in user_columns:
        op.drop_column("users", "email_notifications_proposal_review")
    if "email_notifications_hr_response" in user_columns:
        op.drop_column("users", "email_notifications_hr_response")
