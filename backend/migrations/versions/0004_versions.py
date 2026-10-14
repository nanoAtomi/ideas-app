"""versions, admin edits, "concerns"

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-14
"""
import json
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

FIELDS = ("problem", "audience", "frequency", "helps", "name_idea", "details", "visibility", "anonymous", "image_links", "concerns")


def upgrade() -> None:
    op.add_column("ideas", sa.Column("concerns", sa.String(60), nullable=True))
    op.create_index("ix_ideas_concerns", "ideas", ["concerns"])
    op.add_column("ideas", sa.Column("admin_edit_reason", sa.String(300), nullable=True))
    op.add_column("ideas", sa.Column("admin_edited_at", sa.DateTime(timezone=True), nullable=True))
    versions = op.create_table(
        "idea_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("editor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("by_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reason", sa.String(300), nullable=True),
        sa.Column("fields", sa.JSON(), nullable=False),
        sa.Column("changed", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_idea_versions_idea_id", "idea_versions", ["idea_id"])

    # Every existing idea starts its history with its current state as version 1.
    conn = op.get_bind()
    ideas = conn.execute(sa.text(f"SELECT id, author_id, updated_at, {', '.join(FIELDS[:-1])} FROM ideas")).mappings().all()
    rows = []
    for idea in ideas:
        snapshot = {key: idea[key] for key in FIELDS[:-1]}
        if isinstance(snapshot["image_links"], str):
            snapshot["image_links"] = json.loads(snapshot["image_links"])
        snapshot["anonymous"] = bool(snapshot["anonymous"])
        snapshot["concerns"] = None
        rows.append({
            "idea_id": idea["id"], "number": 1, "editor_id": idea["author_id"], "by_admin": False,
            "reason": None, "fields": snapshot, "changed": [],
            "created_at": idea["updated_at"] or datetime.now(timezone.utc),
        })
    if rows:
        op.bulk_insert(versions, rows)


def downgrade() -> None:
    op.drop_index("ix_idea_versions_idea_id", table_name="idea_versions")
    op.drop_table("idea_versions")
    op.drop_column("ideas", "admin_edited_at")
    op.drop_column("ideas", "admin_edit_reason")
    op.drop_index("ix_ideas_concerns", table_name="ideas")
    op.drop_column("ideas", "concerns")
