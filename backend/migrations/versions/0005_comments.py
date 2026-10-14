"""comments on board ideas

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_comments_idea_id", "comments", ["idea_id"])


def downgrade() -> None:
    op.drop_index("ix_comments_idea_id", table_name="comments")
    op.drop_table("comments")
