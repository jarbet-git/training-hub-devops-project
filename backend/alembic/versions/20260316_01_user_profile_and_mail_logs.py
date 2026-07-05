"""user profile preferences and mail logs

Revision ID: 20260316_01_user_profile_and_mail_logs
Revises: 20260315_01_mandatory_trainings
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

revision = "20260316_01_user_profile_and_mail_logs"
down_revision = "20260315_01_mandatory_trainings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("preferred_language", sa.String(length=2), nullable=False, server_default=sa.text("'pl'")))
    op.add_column("users", sa.Column("preferred_theme", sa.String(length=10), nullable=False, server_default=sa.text("'system'")))
    op.add_column("users", sa.Column("avatar_path", sa.String(length=500), nullable=True))
    op.alter_column("users", "preferred_language", server_default=None)
    op.alter_column("users", "preferred_theme", server_default=None)

    op.create_table(
        "mail_delivery_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("recipients", sa.Text(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("provider", sa.String(length=100), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_mail_delivery_logs_created_at"), "mail_delivery_logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_mail_delivery_logs_created_by_user_id"), "mail_delivery_logs", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_mail_delivery_logs_success"), "mail_delivery_logs", ["success"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mail_delivery_logs_success"), table_name="mail_delivery_logs")
    op.drop_index(op.f("ix_mail_delivery_logs_created_by_user_id"), table_name="mail_delivery_logs")
    op.drop_index(op.f("ix_mail_delivery_logs_created_at"), table_name="mail_delivery_logs")
    op.drop_table("mail_delivery_logs")

    op.drop_column("users", "avatar_path")
    op.drop_column("users", "preferred_theme")
    op.drop_column("users", "preferred_language")
