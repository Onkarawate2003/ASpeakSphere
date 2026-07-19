"""Pydantic schemas for the progress / XP endpoints.

Phase 10 — Progress Tracking & XP System.

These models drive request/response validation for the ``/api/v1/progress``
routes. The response schema is intentionally rich so the dashboard can render
XP, level, streak, counters and the level progress bar from a single read
without re-computing thresholds on the client.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.services.xp_service import LevelProgress


class ProgressResponse(BaseModel):
    """Full progress record for the authenticated user.

    Returned by ``GET /api/v1/progress`` and every award endpoint. All
    derived fields (``level_progress_percent``, ``xp_for_next_level`` …)
    are computed server-side from ``total_xp`` so the frontend never
    duplicates the level math.
    """

    user_id: int
    total_xp: int
    current_level: int
    completed_lessons: int
    completed_conversations: int
    current_streak: int
    last_completed_date: Optional[str] = None
    total_practice_minutes: int

    # Phase 11.5 — Daily tracking progress counters
    daily_practice_minutes: int = 0
    daily_conversations: int = 0
    daily_lessons: int = 0
    daily_quizzes: int = 0

    # Phase 11 — Quiz assessment counters (kept in sync by the quiz
    # completion flow so the dashboard renders in a single read).
    completed_quizzes: int = 0
    average_quiz_score: int = 0
    latest_quiz_score: int = 0

    # Derived level progress (computed from total_xp on every read).
    xp_into_level: int
    xp_for_next_level: int
    xp_needed_for_next: int
    level_progress_percent: float

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AwardXpRequest(BaseModel):
    """Generic XP award payload for future modules (Part 9).

    The ``source`` identifies the module granting XP (``"lesson"``,
    ``"conversation"``, ``"quiz"``, ``"achievement"``,
    ``"daily_challenge"``, ``"vocabulary_game"``, ``"speaking_assessment"``,
    …). The ``reference`` is a stable identifier within that source. The
    unique constraint on ``(user_id, source, reference)`` makes the award
    idempotent — re-awarding the same source+reference is a no-op.

    This generic endpoint lets future modules award XP **without modifying
    the existing XP logic** — they just POST here with their own source.
    """

    source: str = Field(..., min_length=1, max_length=40)
    reference: str = Field(..., min_length=1, max_length=80)
    amount: int = Field(..., gt=0, le=1000)
    reason: Optional[str] = Field(default=None, max_length=200)


class AwardXpResponse(BaseModel):
    """Result of an XP award request.

    ``awarded`` is ``False`` (and ``xp_awarded`` is 0) when the award was a
    duplicate (the source+reference had already been awarded). The returned
    ``progress`` always reflects the current state regardless of whether
    new XP was granted.
    """

    awarded: bool
    xp_awarded: int
    progress: ProgressResponse


class AwardResult(BaseModel):
    """Internal result of awarding XP for a lesson/conversation completion.

    Returned by the CRUD helper so the conversation completion flow can
    decide whether to log the award and so the API can build the response.
    """

    awarded: bool
    xp_awarded: int
    breakdown_total: int = 0
    progress: ProgressResponse


__all__ = [
    "ProgressResponse",
    "AwardXpRequest",
    "AwardXpResponse",
    "AwardResult",
]
