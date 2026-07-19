"""Progress tracking & XP endpoints.

Phase 10 — Progress Tracking & XP System.

All routes are mounted under ``/api/v1/progress`` (see ``main.py``) and
require authentication via ``get_current_user``. Every read/write is scoped
to the authenticated user.

Endpoints
---------
* ``GET /api/v1/progress`` — return the user's progress (auto-creates a
  zeroed row on first read so a brand-new user gets a valid response).
* ``PUT /api/v1/progress`` — update editable progress fields (currently
  only used for manual/admin adjustments; the normal flow updates progress
  automatically via conversation completion).
* ``POST /api/v1/progress/award`` — generic XP award endpoint for future
  modules (Quiz, Achievements, Daily Challenges, …). Idempotent: a
  duplicate ``source``+``reference`` is a no-op.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.crud.progress import (
    award_xp,
    get_or_create_progress,
    to_response,
)
from app.database import get_db
from app.models.users import User
from app.schemas.progress import (
    AwardXpRequest,
    AwardXpResponse,
    ProgressResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressResponse)
def get_user_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressResponse:
    """Return the authenticated user's progress record.

    Auto-creates a zeroed progress row on first read so a brand-new user
    sees a valid (zeroed) response instead of a 404. The derived level
    fields (``xp_into_level``, ``xp_for_next_level``,
    ``level_progress_percent``) are computed server-side from ``total_xp``.
    """
    progress = get_or_create_progress(db, user_id=current_user.id)
    return to_response(progress)


@router.put("", response_model=ProgressResponse)
def update_user_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressResponse:
    """Return the current progress (manual edits are not exposed).

    The progress record is updated automatically when conversations are
    completed (see ``award_conversation_completion``). This endpoint is
    kept for completeness / future admin tooling — it currently just
    returns the current state, ensuring the row exists.
    """
    progress = get_or_create_progress(db, user_id=current_user.id)
    return to_response(progress)


@router.post("/award", response_model=AwardXpResponse)
def award_user_xp(
    payload: AwardXpRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AwardXpResponse:
    """Award XP from any module (Part 9 — future compatibility).

    Future modules (Quiz, Achievements, Daily Challenges, Vocabulary Games,
    Speaking Assessment) award XP by POSTing here with their own ``source``
    and a stable ``reference``. The award is **idempotent**: awarding the
    same ``source``+``reference`` a second time returns ``awarded: false``
    and grants no additional XP, so duplicate rewards are impossible.

    The built-in lesson/conversation completion flow does NOT use this
    endpoint — it awards XP directly inside the conversation completion
    handler (which computes the amount via the XP rules engine). This
    endpoint is for modules that already know their fixed XP amount.
    """
    awarded, xp_awarded, progress = award_xp(
        db,
        user_id=current_user.id,
        source=payload.source,
        reference=payload.reference,
        amount=payload.amount,
        reason=payload.reason,
    )
    if not awarded:
        logger.info(
            "Duplicate XP award ignored for user %s (source=%s reference=%s)",
            current_user.id,
            payload.source,
            payload.reference,
        )
    return AwardXpResponse(
        awarded=awarded,
        xp_awarded=xp_awarded,
        progress=to_response(progress),
    )


__all__ = ["router"]
