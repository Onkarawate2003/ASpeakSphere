"""CRUD operations for the ``daily_activity`` table.

Module M12 — Statistics Dashboard.

The single entry point, :func:`recompute_day`, is used both by the live
completion flows (``crud/progress.py``, called right after a conversation or
quiz completion is awarded) and by the one-time startup backfill
(:func:`backfill_all`). It always recomputes a day's row FROM the source
tables (``Conversation``, ``QuizAttempt``, ``XpAward``) rather than
incrementing counters, so it is idempotent by construction: calling it twice
for the same day is a no-op, and calling it for a historical day (before this
feature existed) produces a correct row with no separate backfill logic to
keep in sync.
"""

from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.conversations import Conversation
from app.models.daily_activity import DailyActivity
from app.models.progress import XpAward
from app.models.quizzes import QuizAttempt


def _day_bounds(activity_date: str) -> tuple[datetime, datetime]:
    """Return the ``[start, end)`` UTC datetime bounds for a "YYYY-MM-DD" day."""
    day_start = datetime.strptime(activity_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return day_start, day_start + timedelta(days=1)


def get_or_create(db: Session, user_id: int, activity_date: str) -> DailyActivity:
    """Return the user's row for ``activity_date``, creating a zeroed one if absent."""
    row = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == user_id,
            DailyActivity.activity_date == activity_date,
        )
        .first()
    )
    if row is not None:
        return row

    row = DailyActivity(user_id=user_id, activity_date=activity_date)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def recompute_day(db: Session, user_id: int, activity_date: str) -> DailyActivity:
    """Recompute one user's ``activity_date`` row from the source tables.

    Overwrites (never increments) ``practice_minutes``, ``conversation_count``,
    ``lesson_count``, ``quiz_count`` and ``xp_earned`` from ``Conversation``,
    ``QuizAttempt`` and ``XpAward`` rows falling on that UTC calendar day.
    Safe to call repeatedly (idempotent) and safe to call for any historical
    day, which is what makes the startup backfill (:func:`backfill_all`)
    possible without separate bookkeeping.
    """
    day_start, day_end = _day_bounds(activity_date)

    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == user_id,
            Conversation.status == "ended",
            Conversation.started_at >= day_start,
            Conversation.started_at < day_end,
        )
        .all()
    )
    conversation_count = len(conversations)
    lesson_count = sum(1 for c in conversations if c.lesson_id is not None)
    practice_minutes = sum((c.duration_seconds or 0) for c in conversations) // 60

    quiz_count = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.completed_at >= day_start,
            QuizAttempt.completed_at < day_end,
        )
        .count()
    )

    xp_earned = (
        db.query(func.sum(XpAward.amount))
        .filter(
            XpAward.user_id == user_id,
            XpAward.created_at >= day_start,
            XpAward.created_at < day_end,
        )
        .scalar()
        or 0
    )

    row = get_or_create(db, user_id=user_id, activity_date=activity_date)
    row.conversation_count = conversation_count
    row.lesson_count = lesson_count
    row.practice_minutes = practice_minutes
    row.quiz_count = quiz_count
    row.xp_earned = xp_earned

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_range(
    db: Session, user_id: int, start_date: str, end_date: str
) -> List[DailyActivity]:
    """Return the user's daily_activity rows in ``[start_date, end_date]``, ordered ascending."""
    return (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == user_id,
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= end_date,
        )
        .order_by(DailyActivity.activity_date.asc())
        .all()
    )


def backfill_all(db: Session) -> None:
    """Recompute every historical ``(user_id, date)`` pair once at startup.

    Discovers distinct days that have real activity from ``Conversation``
    (ended sessions) and ``QuizAttempt`` rows — ``func.date(...)`` is used
    only to enumerate candidate days, not to filter the actual aggregation
    (that happens precisely, in UTC bounds, inside :func:`recompute_day`).
    Idempotent and cheap to run on every startup: days that are already
    correct are simply recomputed to the same values.
    """
    convo_days = (
        db.query(
            Conversation.user_id,
            func.date(Conversation.started_at),
        )
        .filter(Conversation.status == "ended")
        .distinct()
        .all()
    )
    quiz_days = (
        db.query(
            QuizAttempt.user_id,
            func.date(QuizAttempt.completed_at),
        )
        .distinct()
        .all()
    )

    pairs = {(user_id, str(day)) for user_id, day in convo_days}
    pairs.update((user_id, str(day)) for user_id, day in quiz_days)

    for user_id, activity_date in pairs:
        recompute_day(db, user_id=user_id, activity_date=activity_date)


__all__ = [
    "get_or_create",
    "recompute_day",
    "get_range",
    "backfill_all",
]
