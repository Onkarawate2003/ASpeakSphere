"""CRUD aggregation for the Statistics Dashboard.

Module M12 — Statistics Dashboard.

Mirrors ``app.crud.quizzes.get_quiz_stats``'s "load the relevant rows,
aggregate in Python" convention rather than raw SQL ``GROUP BY`` — consistent
with the rest of this codebase.
"""

from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy.orm import Session

from app.crud.daily_activity import get_range as get_daily_activity_range
from app.crud.progress import get_or_create_progress
from app.models.conversations import Conversation
from app.schemas.stats import (
    CategoryDistributionItem,
    DailyActivityPoint,
    StatsOverviewResponse,
    StatsRange,
)

#: Sentinel start date for the "all time" range — lexicographically before
#: any real "YYYY-MM-DD" activity date, so a plain string ``>=`` comparison
#: still works without a separate "no lower bound" code path.
_EPOCH = "0001-01-01"


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def resolve_range(range_: StatsRange) -> tuple[str, str]:
    """Return the ``(start_date, end_date)`` (inclusive, "YYYY-MM-DD") for a range."""
    today = datetime.now(timezone.utc).date()

    if range_ == StatsRange.today:
        start = today
    elif range_ == StatsRange.seven_days:
        start = today - timedelta(days=6)
    elif range_ == StatsRange.thirty_days:
        start = today - timedelta(days=29)
    elif range_ == StatsRange.ninety_days:
        start = today - timedelta(days=89)
    elif range_ == StatsRange.year:
        start = today.replace(month=1, day=1)
    else:  # StatsRange.all_time
        return _EPOCH, today.strftime("%Y-%m-%d")

    return start.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d")


def get_daily_series(
    db: Session, user_id: int, range_: StatsRange
) -> List[DailyActivityPoint]:
    """Return the per-day activity points for ``range_``, oldest first."""
    start_date, end_date = resolve_range(range_)
    rows = get_daily_activity_range(db, user_id=user_id, start_date=start_date, end_date=end_date)
    return [
        DailyActivityPoint(
            date=row.activity_date,
            practice_minutes=row.practice_minutes,
            conversation_count=row.conversation_count,
            lesson_count=row.lesson_count,
            quiz_count=row.quiz_count,
            xp_earned=row.xp_earned,
        )
        for row in rows
    ]


def get_overview(db: Session, user_id: int, range_: StatsRange) -> StatsOverviewResponse:
    """Return range-scoped totals plus current-state fields for summary tiles."""
    start_date, end_date = resolve_range(range_)
    rows = get_daily_activity_range(db, user_id=user_id, start_date=start_date, end_date=end_date)

    progress = get_or_create_progress(db, user_id=user_id)

    return StatsOverviewResponse(
        range=range_,
        xp_earned=sum(row.xp_earned for row in rows),
        practice_minutes=sum(row.practice_minutes for row in rows),
        conversations_completed=sum(row.conversation_count for row in rows),
        lessons_completed=sum(row.lesson_count for row in rows),
        quizzes_completed=sum(row.quiz_count for row in rows),
        active_days=sum(1 for row in rows if row.conversation_count or row.quiz_count),
        current_streak=progress.current_streak,
        current_level=progress.current_level,
        average_quiz_score=progress.average_quiz_score,
    )


def get_category_distribution(
    db: Session, user_id: int, range_: StatsRange
) -> List[CategoryDistributionItem]:
    """Return session count + total minutes per practice category in ``range_``."""
    start_date, end_date = resolve_range(range_)
    start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)

    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == user_id,
            Conversation.status == "ended",
            Conversation.started_at >= start_dt,
            Conversation.started_at < end_dt,
        )
        .all()
    )

    buckets: dict[str, dict[str, int]] = {}
    for convo in conversations:
        bucket = buckets.setdefault(
            convo.practice_type, {"session_count": 0, "total_minutes": 0}
        )
        bucket["session_count"] += 1
        bucket["total_minutes"] += (convo.duration_seconds or 0) // 60

    return [
        CategoryDistributionItem(
            practice_type=practice_type,
            session_count=data["session_count"],
            total_minutes=data["total_minutes"],
        )
        for practice_type, data in sorted(buckets.items())
    ]


__all__ = [
    "resolve_range",
    "get_daily_series",
    "get_overview",
    "get_category_distribution",
]
