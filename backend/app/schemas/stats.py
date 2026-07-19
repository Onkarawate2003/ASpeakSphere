"""Pydantic schemas for the Statistics Dashboard endpoints.

Module M12 — Statistics Dashboard.

These models drive request/response validation for the
``/api/v1/stats`` routes. All aggregation happens server-side (mirroring the
``QuizStatsResponse`` convention in ``app.schemas.quizzes``) so the frontend
never re-implements date-range math.
"""

from enum import Enum

from pydantic import BaseModel


class StatsRange(str, Enum):
    """Supported statistics date-range filters."""

    today = "today"
    seven_days = "7d"
    thirty_days = "30d"
    ninety_days = "90d"
    year = "year"
    all_time = "all"


class DailyActivityPoint(BaseModel):
    """A single day's activity snapshot — one point on a time-series chart."""

    date: str
    practice_minutes: int
    conversation_count: int
    lesson_count: int
    quiz_count: int
    xp_earned: int

    class Config:
        from_attributes = True


class CategoryDistributionItem(BaseModel):
    """Session count + total practice minutes for one practice category."""

    practice_type: str
    session_count: int
    total_minutes: int


class StatsOverviewResponse(BaseModel):
    """Range-scoped totals plus a few current-state fields for summary tiles.

    Returned by ``GET /api/v1/stats/overview``. The range totals are summed
    from ``daily_activity``; ``current_streak``, ``current_level`` and
    ``average_quiz_score`` are the user's current state (not range-scoped)
    reused from ``UserProgress`` so the summary tiles render in one read.
    """

    range: StatsRange
    xp_earned: int
    practice_minutes: int
    conversations_completed: int
    lessons_completed: int
    quizzes_completed: int
    active_days: int

    current_streak: int
    current_level: int
    average_quiz_score: int


__all__ = [
    "StatsRange",
    "DailyActivityPoint",
    "CategoryDistributionItem",
    "StatsOverviewResponse",
]
