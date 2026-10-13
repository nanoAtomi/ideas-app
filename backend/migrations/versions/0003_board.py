"""board: image links and votes

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ideas", sa.Column("image_links", sa.JSON(), nullable=False, server_default="[]"))
    op.create_table(
        "votes",
        sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_votes_user_id", "votes", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_votes_user_id", table_name="votes")
    op.drop_table("votes")
    op.drop_column("ideas", "image_links")
