"""SQLAlchemy models for progress tracking and the XP system.

Phase 10 — Progress Tracking & XP System.

Two tables are introduced:

* ``user_progress`` — a single summary row per user (one-to-one with
  ``users``). It stores the aggregate XP, level, streak and counters that
  the dashboard renders live. It is created lazily the first time XP is
  awarded (or fetched via the ``GET /api/v1/progress`` endpoint which
  auto-creates a zeroed row).

* ``xp_awards`` — an append-only ledger of every XP grant. Each row records
  the ``source`` (lesson / conversation / quiz / …), a stable
  ``reference`` (e.g. the conversation id or lesson id) and the amount
  awarded. The unique constraint on ``(user_id, source, reference)`` is the
  single source of truth that guarantees **XP is only ever awarded once per
  lesson/conversation completion** — re-completing the same conversation is
  a no-op. New future modules (Quiz, Achievements, Daily Challenges,
  Vocabulary Games, Speaking Assessment) simply insert a new row with their
  own ``source`` value without touching the existing XP logic.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserProgress(Base):
    """A single aggregate progress record for a user.

    One row per user (enforced by ``uq_user_progress_user_id``). All
    counters are denormalised here so the dashboard can render in a single
    read without aggregating the ``xp_awards`` ledger on every request.
    """

    __tablename__ = "user_progress"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_progress_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Aggregate XP earned across every source. Always reflects the sum of
    # the xp_awards ledger (kept in sync by the award_xp CRUD helper).
    total_xp = Column(Integer, nullable=False, default=0)

    # Current level derived from total_xp via the level thresholds. Stored
    # so the dashboard reads it directly, but recomputed on every award so
    # it never drifts from total_xp.
    current_level = Column(Integer, nullable=False, default=1)

    # Counters incremented exactly once per completed lesson / conversation.
    completed_lessons = Column(Integer, nullable=False, default=0)
    completed_conversations = Column(Integer, nullable=False, default=0)

    # Phase 11 — Quiz assessment counters. ``completed_quizzes`` counts the
    # number of distinct quizzes the learner has passed (awarded XP for).
    # ``average_quiz_score`` and ``latest_quiz_score`` are percentages (0–100)
    # kept in sync by the quiz completion flow so the dashboard renders in a
    # single read without aggregating ``quiz_attempts`` on every request.
    completed_quizzes = Column(Integer, nullable=False, default=0)
    average_quiz_score = Column(Integer, nullable=False, default=0)
    latest_quiz_score = Column(Integer, nullable=False, default=0)

    # Streak tracking. ``current_streak`` is the number of consecutive days
    # the learner has completed at least one lesson/conversation.
    # ``last_completed_date`` is the UTC date of the most recent completion
    # (stored as a string ``YYYY-MM-DD`` so it is timezone-safe and easy to
    # compare without datetime edge cases).
    current_streak = Column(Integer, nullable=False, default=0)
    last_completed_date = Column(String(10), nullable=True)

    # Total minutes practised across all completed conversations. Drives the
    # dashboard "practice minutes" stat and the daily-goal progress.
    total_practice_minutes = Column(Integer, nullable=False, default=0)

    # Daily progress tracking. Reset at the beginning of a new calendar day.
    daily_practice_minutes = Column(Integer, nullable=False, default=0)
    daily_conversations = Column(Integer, nullable=False, default=0)
    daily_lessons = Column(Integer, nullable=False, default=0)
    daily_quizzes = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Back-reference to the owning user.
    user = relationship("User", back_populates="progress")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<UserProgress user_id={self.user_id} total_xp={self.total_xp} "
            f"level={self.current_level}>"
        )


class XpAward(Base):
    """Append-only ledger of a single XP grant.

    The unique constraint on ``(user_id, source, reference)`` makes XP
    awarding idempotent: attempting to award XP for the same source +
    reference a second time is detected and skipped (no duplicate XP).

    ``source`` is a short string identifying the module that granted the XP
    (``"lesson"``, ``"conversation"``, ``"quiz"``, ``"achievement"``,
    ``"daily_challenge"``, ``"vocabulary_game"``, ``"speaking_assessment"``,
    …). Future modules add new sources without modifying existing logic.

    ``reference`` is a stable identifier within that source — typically the
    conversation id (for lesson/conversation XP) or the lesson catalog id.
    """

    __tablename__ = "xp_awards"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "source",
            "reference",
            name="uq_xp_awards_user_source_reference",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The module that granted the XP. See class docstring for the catalog.
    source = Column(String(40), nullable=False)

    # Stable identifier within the source (e.g. conversation id as string).
    reference = Column(String(80), nullable=False)

    # How much XP was granted by this single award.
    amount = Column(Integer, nullable=False)

    # Optional human-readable reason for display in future activity feeds.
    reason = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<XpAward user_id={self.user_id} source={self.source!r} "
            f"reference={self.reference!r} amount={self.amount}>"
        )


__all__ = ["UserProgress", "XpAward"]
