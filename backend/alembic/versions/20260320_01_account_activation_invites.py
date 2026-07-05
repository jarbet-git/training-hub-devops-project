"""add account activation invites

Revision ID: 20260320_01_account_activation_invites
Revises: 20260319_01_notification_read_watermarks
Create Date: 2026-03-20

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260320_01_account_activation_invites"
down_revision = "20260319_01_notification_read_watermarks"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _get_columns(bind, table_name: str) -> set[str]:
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name)}


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return index_name in {idx["name"] for idx in inspector.get_indexes(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    user_columns = _get_columns(bind, "users")

    if "is_pending_activation" not in user_columns:
        op.add_column("users", sa.Column("is_pending_activation", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "activated_at" not in user_columns:
        op.add_column("users", sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))

    if not _has_table(bind, "account_activation_tokens"):
        op.create_table(
            "account_activation_tokens",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index(bind, "account_activation_tokens", op.f("ix_account_activation_tokens_token_hash")):
        op.create_index(op.f("ix_account_activation_tokens_token_hash"), "account_activation_tokens", ["token_hash"], unique=True)
    if not _has_index(bind, "account_activation_tokens", op.f("ix_account_activation_tokens_user_id")):
        op.create_index(op.f("ix_account_activation_tokens_user_id"), "account_activation_tokens", ["user_id"], unique=False)

    try:
        op.alter_column("users", "is_pending_activation", server_default=None)
    except Exception:
        pass


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "account_activation_tokens"):
        if _has_index(bind, "account_activation_tokens", op.f("ix_account_activation_tokens_user_id")):
            op.drop_index(op.f("ix_account_activation_tokens_user_id"), table_name="account_activation_tokens")
        if _has_index(bind, "account_activation_tokens", op.f("ix_account_activation_tokens_token_hash")):
            op.drop_index(op.f("ix_account_activation_tokens_token_hash"), table_name="account_activation_tokens")
        op.drop_table("account_activation_tokens")

    user_columns = _get_columns(bind, "users")
    if "activated_at" in user_columns:
        op.drop_column("users", "activated_at")
    if "is_pending_activation" in user_columns:
        op.drop_column("users", "is_pending_activation")
