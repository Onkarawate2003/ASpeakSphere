"""SQLAlchemy model for the ``daily_activity`` table.

Module M12 — Statistics Dashboard.

One row per ``(user_id, activity_date)``. Unlike ``UserProgress.daily_*``
(single "today" counters that reset at midnight), this is a persisted,
append-over-time snapshot so the Statistics Dashboard can render real
7/30/90-day trends and a calendar heatmap.

Rows are never incremented — they are always **recomputed from the source
tables** (``Conversation``, ``QuizAttempt``, ``XpAward``) by
``app.crud.daily_activity.recompute_day``, which makes writing idempotent
and self-healing (calling it twice for the same day is a no-op; historical
days can be backfilled the same way as new ones).
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class DailyActivity(Base):
    """A single day's activity snapshot for one user."""

    __tablename__ = "daily_activity"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_daily_activity_user_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # UTC calendar day, "YYYY-MM-DD" — matches the existing
    # UserProgress.last_completed_date string-date convention.
    activity_date = Column(String(10), nullable=False, index=True)

    practice_minutes = Column(Integer, nullable=False, default=0)
    conversation_count = Column(Integer, nullable=False, default=0)
    lesson_count = Column(Integer, nullable=False, default=0)
    quiz_count = Column(Integer, nullable=False, default=0)
    xp_earned = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<DailyActivity user_id={self.user_id} date={self.activity_date!r} "
            f"minutes={self.practice_minutes} conversations={self.conversation_count} "
            f"quizzes={self.quiz_count} xp={self.xp_earned}>"
        )


__all__ = ["DailyActivity"]
