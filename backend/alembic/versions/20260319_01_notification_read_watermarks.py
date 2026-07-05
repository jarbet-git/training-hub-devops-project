"""add notification read watermarks

Revision ID: 20260319_01_notification_read_watermarks
Revises: 20260316_02_password_reset_tokens
Create Date: 2026-03-19 10:45:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260319_01_notification_read_watermarks"
down_revision = "20260316_02_password_reset_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_read_watermarks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(length=120), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "scope", name="uq_notification_read_watermarks_user_scope"),
    )
    op.create_index(op.f("ix_notification_read_watermarks_scope"), "notification_read_watermarks", ["scope"], unique=False)
    op.create_index(op.f("ix_notification_read_watermarks_user_id"), "notification_read_watermarks", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_read_watermarks_user_id"), table_name="notification_read_watermarks")
    op.drop_index(op.f("ix_notification_read_watermarks_scope"), table_name="notification_read_watermarks")
    op.drop_table("notification_read_watermarks")
