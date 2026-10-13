"""ideas

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ideas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("audience", sa.String(300), nullable=True),
        sa.Column("frequency", sa.String(16), nullable=True),
        sa.Column("helps", sa.Text(), nullable=True),
        sa.Column("name_idea", sa.String(120), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("visibility", sa.String(16), nullable=False, server_default="board"),
        sa.Column("anonymous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(16), nullable=False, server_default="new"),
        sa.Column("position", sa.Float(), nullable=False, server_default="0"),
        sa.Column("admin_reply", sa.Text(), nullable=True),
        sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ideas_author_id", "ideas", ["author_id"])
    op.create_index("ix_ideas_status", "ideas", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ideas_status", table_name="ideas")
    op.drop_index("ix_ideas_author_id", table_name="ideas")
    op.drop_table("ideas")
