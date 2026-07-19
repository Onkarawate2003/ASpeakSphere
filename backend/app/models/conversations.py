"""SQLAlchemy model for the ``conversations`` table.

A conversation represents a single AI practice session owned by a user. It
groups the messages exchanged between the learner and the AI tutor and tracks
the session lifecycle (active → ended) plus a few lightweight metrics such as
duration.

The ``practice_type`` and ``status`` columns are stored as plain strings (not
SQLAlchemy ``Enum`` types) to mirror the convention already used by
``user_preferences`` (e.g. ``learning_goal``, ``goal_tier``). The allowed
values are validated at the API boundary by Pydantic enums in
``app.schemas.conversations``.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # The practice mode that launched this session. Mirrors the frontend
    # PracticeType union: speaking | listening | vocabulary | grammar |
    # pronunciation.
    practice_type = Column(String(40), nullable=False)

    # Phase 9 — Lesson System. The selected lesson is persisted with the
    # conversation so Emma can teach that specific lesson and the history can
    # display it. All three columns are nullable so pre-Phase-9 conversations
    # (and free-form sessions without a lesson) keep working unchanged.
    lesson_id = Column(String(80), nullable=True)
    lesson_title = Column(String(200), nullable=True)
    # Objectives are stored as a single newline-joined text blob to avoid a
    # separate table / JSON column while keeping the data human-readable.
    lesson_objectives = Column(Text, nullable=True)

    # Lifecycle of the session: "active" while in progress, "ended" once the
    # user finishes or abandons it. Defaults to "active" on creation.
    status = Column(String(24), nullable=False, default="active")

    # When the session actually began (set on creation). Kept separate from
    # created_at so that a future "resume" feature could distinguish record
    # creation from session start.
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Populated when the session is completed/ended; null while active.
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Total session length in seconds, computed when the session ends.
    duration_seconds = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Back-reference to the owning user (mirrors User.conversations).
    user = relationship("User", back_populates="conversations")

    # One-to-many: a conversation owns many messages. Deleting a conversation
    # cascades to its messages.
    messages = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.id",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Conversation id={self.id} user_id={self.user_id} practice_type={self.practice_type!r} status={self.status!r}>"


__all__ = ["Conversation"]