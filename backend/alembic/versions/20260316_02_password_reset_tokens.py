"""add password reset tokens

Revision ID: 20260316_02_password_reset_tokens
Revises: 20260316_01_user_profile_and_mail_logs
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

revision = "20260316_02_password_reset_tokens"
down_revision = "20260316_01_user_profile_and_mail_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_ip", sa.String(length=100), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_password_reset_tokens_created_at"), "password_reset_tokens", ["created_at"], unique=False)
    op.create_index(op.f("ix_password_reset_tokens_expires_at"), "password_reset_tokens", ["expires_at"], unique=False)
    op.create_index(op.f("ix_password_reset_tokens_token_hash"), "password_reset_tokens", ["token_hash"], unique=True)
    op.create_index(op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_password_reset_tokens_user_id"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_token_hash"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_expires_at"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_created_at"), table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
