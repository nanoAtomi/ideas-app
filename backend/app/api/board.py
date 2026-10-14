"""The idea board: every idea its author put "on the board", for everyone signed in.

Hidden (by an admin), deleted and private ideas never show up here. Anonymous ideas
show without the author's name - only admins see who wrote them (admin board) - and
so do the author's own comments on them.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..auth import current_user, has_role
from ..db import get_db
from ..models import Comment, Idea, User, Vote, utcnow

router = APIRouter(prefix="/api/board", tags=["board"])


class BoardIdea(BaseModel):
    id: int
    problem: str
    audience: str | None
    frequency: str | None
    helps: str | None
    name_idea: str | None
    details: str | None
    image_links: list[str]
    # The app it is for; None = a new app.
    concerns: str | None
    status: str
    created_at: datetime
    # None = anonymous.
    author_name: str | None
    votes: int
    voted: bool
    mine: bool
    comments: int


def _on_board():
    return (Idea.visibility == "board", Idea.hidden.is_(False), Idea.deleted_at.is_(None))


def _board_idea(db: Session, idea_id: int) -> Idea:
    idea = db.scalar(select(Idea).where(Idea.id == idea_id, *_on_board()))
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@router.get("", response_model=list[BoardIdea])
def board(
    sort: str = Query("votes", pattern="^(votes|new)$"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[BoardIdea]:
    votes = select(Vote.idea_id, func.count().label("n")).group_by(Vote.idea_id).subquery()
    count = func.coalesce(votes.c.n, 0)
    order = (count.desc(), Idea.created_at.desc(), Idea.id.desc()) if sort == "votes" else (Idea.created_at.desc(), Idea.id.desc())
    rows = db.execute(
        select(Idea, count)
        .outerjoin(votes, votes.c.idea_id == Idea.id)
        .where(*_on_board())
        .options(joinedload(Idea.author))
        .order_by(*order)
    ).all()
    mine_voted = set(db.scalars(select(Vote.idea_id).where(Vote.user_id == user.id)))
    comment_counts = dict(db.execute(select(Comment.idea_id, func.count()).group_by(Comment.idea_id)).all())
    return [
        BoardIdea(
            id=idea.id,
            problem=idea.problem,
            audience=idea.audience,
            frequency=idea.frequency,
            helps=idea.helps,
            name_idea=idea.name_idea,
            details=idea.details,
            image_links=idea.image_links or [],
            concerns=idea.concerns,
            status=idea.status,
            created_at=idea.created_at,
            author_name=None if idea.anonymous else idea.author.display_name,
            votes=n,
            voted=idea.id in mine_voted,
            mine=idea.author_id == user.id,
            comments=comment_counts.get(idea.id, 0),
        )
        for idea, n in rows
    ]


@router.put("/{idea_id}/vote", status_code=204)
def vote(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    idea = _board_idea(db, idea_id)
    if idea.author_id == user.id:
        raise HTTPException(status_code=409, detail="You can't vote for your own idea")
    if db.get(Vote, (idea.id, user.id)) is None:
        db.add(Vote(idea_id=idea.id, user_id=user.id, created_at=utcnow()))
        db.commit()
    return Response(status_code=204)


@router.delete("/{idea_id}/vote", status_code=204)
def unvote(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    existing = db.get(Vote, (_board_idea(db, idea_id).id, user.id))
    if existing is not None:
        db.delete(existing)
        db.commit()
    return Response(status_code=204)


class CommentIn(BaseModel):
    body: str = Field(max_length=2000)

    @field_validator("body")
    @classmethod
    def _body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("body must not be blank")
        return value


class CommentOut(BaseModel):
    id: int
    body: str
    # None = the idea's author on an anonymous idea.
    author_name: str | None
    by_idea_author: bool
    mine: bool
    can_delete: bool
    created_at: datetime


def _comment_out(comment: Comment, idea: Idea, user: User, admin: bool) -> CommentOut:
    by_author = comment.author_id == idea.author_id
    return CommentOut(
        id=comment.id,
        body=comment.body,
        author_name=None if by_author and idea.anonymous else comment.author.display_name,
        by_idea_author=by_author,
        mine=comment.author_id == user.id,
        can_delete=admin or comment.author_id == user.id,
        created_at=comment.created_at,
    )


@router.get("/{idea_id}/comments", response_model=list[CommentOut])
def comments(idea_id: int, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[CommentOut]:
    idea = _board_idea(db, idea_id)
    admin = has_role(request, "admin")
    rows = db.scalars(
        select(Comment).where(Comment.idea_id == idea.id).options(joinedload(Comment.author)).order_by(Comment.created_at, Comment.id)
    )
    return [_comment_out(c, idea, user, admin) for c in rows]


@router.post("/{idea_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    idea_id: int, body: CommentIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> CommentOut:
    idea = _board_idea(db, idea_id)
    comment = Comment(idea_id=idea.id, author_id=user.id, body=body.body, created_at=utcnow())
    db.add(comment)
    db.commit()
    return _comment_out(comment, idea, user, has_role(request, "admin"))


@router.delete("/{idea_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    idea_id: int, comment_id: int, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Response:
    comment = db.get(Comment, comment_id)
    if comment is None or comment.idea_id != idea_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != user.id and not has_role(request, "admin"):
        raise HTTPException(status_code=403, detail="Not your comment")
    db.delete(comment)
    db.commit()
    return Response(status_code=204)
