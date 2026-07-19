"""Statistics Dashboard endpoints.

Module M12 — Statistics Dashboard.

All routes are mounted under ``/api/v1/stats`` (see ``main.py``) and require
authentication via ``get_current_user``. Every read is scoped to the
authenticated user. Mirrors the thin-router style of ``app/api/v1/quizzes.py``
— all aggregation lives in ``app.crud.stats``.

Endpoints
---------
* ``GET /api/v1/stats/overview`` — range-scoped totals (XP, practice minutes,
  conversations/lessons/quizzes completed, active days) plus current-state
  fields (streak, level, average quiz score) for the summary tiles.
* ``GET /api/v1/stats/daily-activity`` — per-day activity points for the
  selected range, powering the XP/practice-time/session charts and the
  calendar heatmap.
* ``GET /api/v1/stats/category-distribution`` — session count + total
  minutes per practice category (speaking/listening/vocabulary/grammar/
  pronunciation) for the selected range.

Every route accepts the same ``range`` query parameter (``StatsRange``:
``today | 7d | 30d | 90d | year | all``) so every chart updates from the
same filter bar.
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.crud.stats import (
    get_category_distribution,
    get_daily_series,
    get_overview,
)
from app.database import get_db
from app.models.users import User
from app.schemas.stats import (
    CategoryDistributionItem,
    DailyActivityPoint,
    StatsOverviewResponse,
    StatsRange,
)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview", response_model=StatsOverviewResponse)
def get_stats_overview(
    range: StatsRange = StatsRange.thirty_days,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StatsOverviewResponse:
    """Return range-scoped totals plus current-state fields for summary tiles."""
    return get_overview(db, user_id=current_user.id, range_=range)


@router.get("/daily-activity", response_model=List[DailyActivityPoint])
def get_stats_daily_activity(
    range: StatsRange = StatsRange.thirty_days,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[DailyActivityPoint]:
    """Return the per-day activity points for the selected range, oldest first."""
    return get_daily_series(db, user_id=current_user.id, range_=range)


@router.get("/category-distribution", response_model=List[CategoryDistributionItem])
def get_stats_category_distribution(
    range: StatsRange = StatsRange.thirty_days,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[CategoryDistributionItem]:
    """Return session count + total minutes per practice category."""
    return get_category_distribution(db, user_id=current_user.id, range_=range)


__all__ = ["router"]
