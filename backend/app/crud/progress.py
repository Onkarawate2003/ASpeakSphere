"""CRUD operations for progress tracking and the XP system.

Phase 10 — Progress Tracking & XP System.

All functions expect an open SQLAlchemy ``Session`` and are scoped to a
``user_id`` (supplied by the authenticated user in the API layer).

The central function is :func:`award_conversation_completion`, called by
the conversation completion flow. It:

  1. Computes the XP for the completed conversation (lesson vs free-form).
  2. Inserts an :class:`XpAward` row — the unique constraint on
     ``(user_id, source, reference)`` makes this **idempotent**: a
     duplicate award (same conversation completed twice) is detected and
     skipped, so XP is only ever awarded once per completion.
  3. Updates the aggregate :class:`UserProgress` row (XP, level, counters,
     streak, practice minutes) — only when the award was new.

The generic :func:`award_xp` helper exposes the same idempotent mechanism
to future modules (Quiz, Achievements, …) without them touching the
existing XP logic (Part 9).
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.daily_activity import recompute_day
from app.models.progress import UserProgress, XpAward
from app.schemas.progress import ProgressResponse
from app.services.xp_service import (
    calculate_conversation_xp,
    calculate_lesson_xp,
    calculate_quiz_xp,
    level_for_xp,
    level_progress,
)

#: Sources used by the built-in completion flow. Future modules use their
#: own source strings via the generic ``award_xp`` helper.
SOURCE_LESSON = "lesson"
SOURCE_CONVERSATION = "conversation"
SOURCE_QUIZ = "quiz"


# --------------------------------------------------------------------- #
# Read helpers
# --------------------------------------------------------------------- #


def get_progress(db: Session, user_id: int) -> Optional[UserProgress]:
    """Return the user's progress row, or ``None`` if it does not exist yet."""
    return (
        db.query(UserProgress)
        .filter(UserProgress.user_id == user_id)
        .first()
    )


def get_or_create_progress(db: Session, user_id: int) -> UserProgress:
    """Return the user's progress row, creating a zeroed row if absent.

    The dashboard calls this on every read so a brand-new user sees a
    valid (zeroed) progress record instead of a 404.
    """
    progress = get_progress(db, user_id=user_id)
    if progress is not None:
        return progress

    progress = UserProgress(
        user_id=user_id,
        total_xp=0,
        current_level=1,
        completed_lessons=0,
        completed_conversations=0,
        current_streak=0,
        last_completed_date=None,
        total_practice_minutes=0,
        daily_practice_minutes=0,
        daily_conversations=0,
        daily_lessons=0,
        daily_quizzes=0,
        completed_quizzes=0,
        average_quiz_score=0,
        latest_quiz_score=0,
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


def to_response(progress: UserProgress) -> ProgressResponse:
    """Build a :class:`ProgressResponse` (with derived level fields) from a row.

    The derived fields (``xp_into_level``, ``xp_for_next_level`` …) are
    computed from ``total_xp`` via :func:`level_progress` so the frontend
    never re-implements the threshold math.
    """
    lp = level_progress(progress.total_xp)
    today = _today_str()
    is_same_day = progress.last_completed_date == today
    return ProgressResponse(
        user_id=progress.user_id,
        total_xp=progress.total_xp,
        current_level=progress.current_level,
        completed_lessons=progress.completed_lessons,
        completed_conversations=progress.completed_conversations,
        current_streak=progress.current_streak,
        last_completed_date=progress.last_completed_date,
        total_practice_minutes=progress.total_practice_minutes,
        daily_practice_minutes=progress.daily_practice_minutes if is_same_day else 0,
        daily_conversations=progress.daily_conversations if is_same_day else 0,
        daily_lessons=progress.daily_lessons if is_same_day else 0,
        daily_quizzes=progress.daily_quizzes if is_same_day else 0,
        completed_quizzes=progress.completed_quizzes,
        average_quiz_score=progress.average_quiz_score,
        latest_quiz_score=progress.latest_quiz_score,
        xp_into_level=lp.xp_into_level,
        xp_for_next_level=lp.xp_for_next_level,
        xp_needed_for_next=lp.xp_needed_for_next,
        level_progress_percent=lp.progress_percent,
        created_at=progress.created_at,
        updated_at=progress.updated_at,
    )


def get_conversation_xp(db: Session, user_id: int, conversation_id: int) -> int:
    """Return the total XP awarded for completing a single conversation.

    Phase 10.5 — Conversation History Enhancement.

    Queries the ``xp_awards`` ledger for the lesson/conversation source tied
    to this conversation id (the award ``reference`` is ``str(conversation_id)``
    — see :func:`award_conversation_completion`). Returns ``0`` when no award
    exists (e.g. an active conversation that hasn't been completed yet, or a
    pre-Phase-10 conversation that predates the XP system).

    This lets the history list/detail surfaces show "XP earned" per session
    without duplicating the award logic — it simply reads the ledger that the
    completion flow already wrote to.
    """
    rows = (
        db.query(XpAward)
        .filter(
            XpAward.user_id == user_id,
            XpAward.reference == str(conversation_id),
            XpAward.source.in_([SOURCE_LESSON, SOURCE_CONVERSATION]),
        )
        .all()
    )
    return sum(row.amount for row in rows)


# --------------------------------------------------------------------- #
# Streak helpers
# --------------------------------------------------------------------- #


def _today_str() -> str:
    """Return today's UTC date as ``YYYY-MM-DD`` (timezone-safe)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _compute_streak(
    current_streak: int,
    last_completed_date: Optional[str],
    today: Optional[str] = None,
) -> int:
    """Return the updated streak for a completion happening today.

    Rules:
      * No previous completion → streak becomes 1.
      * Last completion was today → streak unchanged (same-day completion
        does not extend the streak, but does not reset it).
      * Last completion was yesterday → streak increments by 1.
      * Last completion was older than yesterday → streak resets to 1.
    """
    today = today or _today_str()
    if last_completed_date is None:
        return 1
    if last_completed_date == today:
        return current_streak if current_streak > 0 else 1

    last = _parse_date(last_completed_date)
    today_date = _parse_date(today)
    if last is None or today_date is None:
        return 1

    delta_days = (today_date - last).days
    if delta_days == 1:
        return current_streak + 1
    # Gap too large (or negative, defensively) → reset.
    return 1


def _parse_date(value: str) -> Optional[datetime]:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None


# --------------------------------------------------------------------- #
# Award helpers
# --------------------------------------------------------------------- #


def _has_award(
    db: Session, user_id: int, source: str, reference: str
) -> bool:
    """Return ``True`` if an XP award already exists for this source+reference."""
    existing = (
        db.query(XpAward)
        .filter(
            XpAward.user_id == user_id,
            XpAward.source == source,
            XpAward.reference == reference,
        )
        .first()
    )
    return existing is not None


def award_xp(
    db: Session,
    *,
    user_id: int,
    source: str,
    reference: str,
    amount: int,
    reason: Optional[str] = None,
) -> tuple[bool, int, UserProgress]:
    """Award ``amount`` XP for ``source``/``reference`` (idempotent).

    Returns ``(awarded, xp_awarded, progress)``. When the award is a
    duplicate (the source+reference was already awarded), ``awarded`` is
    ``False`` and ``xp_awarded`` is 0 — the progress row is returned
    unchanged.

    This is the generic entry point future modules use (Part 9). The
    built-in completion flow uses :func:`award_conversation_completion`
    which computes the amount via the XP rules engine and then delegates
    here.
    """
    # Fast path: duplicate award → no-op.
    if _has_award(db, user_id, source, reference):
        progress = get_or_create_progress(db, user_id)
        return False, 0, progress

    progress = get_or_create_progress(db, user_id)

    award = XpAward(
        user_id=user_id,
        source=source,
        reference=reference,
        amount=amount,
        reason=reason,
    )
    db.add(award)

    try:
        db.flush()
    except IntegrityError:
        # Race condition: another request inserted the same award between
        # our check and our insert. Roll back the award insert only and
        # treat as a duplicate.
        db.rollback()
        progress = get_or_create_progress(db, user_id)
        return False, 0, progress

    # Apply the XP to the aggregate row.
    progress.total_xp += amount
    progress.current_level = level_for_xp(progress.total_xp)

    db.add(progress)
    db.commit()
    db.refresh(progress)
    return True, amount, progress


def award_conversation_completion(
    db: Session,
    *,
    user_id: int,
    conversation_id: int,
    duration_seconds: int,
    is_lesson: bool,
    lesson_id: Optional[str] = None,
) -> tuple[bool, int, UserProgress]:
    """Award XP for completing a conversation (lesson or free-form).

    This is the function the conversation completion flow calls. It:

      1. Determines whether this is a lesson completion (``is_lesson``) or
         a free-form conversation.
      2. Computes the XP via the rules engine (lesson XP includes the
         lesson base + conversation base + duration bonus + first-of-day
         bonus, clamped to 100; free-form XP is conversation base +
         duration bonus).
      3. Delegates to :func:`award_xp` with ``source="lesson"`` or
         ``"conversation"`` and ``reference=str(conversation_id)``. The
         unique constraint guarantees XP is awarded **exactly once** per
         conversation — re-completing the same conversation is a no-op.
      4. When the award is new, updates the counters (completed lessons /
         conversations), the streak and the practice minutes.

    Returns ``(awarded, xp_awarded, progress)``.
    """
    source = SOURCE_LESSON if is_lesson else SOURCE_CONVERSATION
    reference = str(conversation_id)

    # Duplicate check first so we never recompute streaks/counters for an
    # already-awarded conversation.
    if _has_award(db, user_id, source, reference):
        progress = get_or_create_progress(db, user_id)
        return False, 0, progress

    progress = get_or_create_progress(db, user_id)

    # Compute the XP amount via the rules engine.
    if is_lesson:
        today = _today_str()
        is_first_of_day = progress.last_completed_date != today
        breakdown = calculate_lesson_xp(
            duration_seconds=duration_seconds,
            is_first_lesson_of_day=is_first_of_day,
        )
        amount = breakdown.total
        reason = (
            f"Lesson complete (+{breakdown.base_lesson} lesson, "
            f"+{breakdown.base_conversation} conversation, "
            f"+{breakdown.duration_bonus} duration, "
            f"+{breakdown.first_of_day_bonus} first-of-day)"
        )
    else:
        amount = calculate_conversation_xp(duration_seconds=duration_seconds)
        reason = f"Conversation complete (+{amount} XP)"

    awarded, xp_awarded, progress = award_xp(
        db,
        user_id=user_id,
        source=source,
        reference=reference,
        amount=amount,
        reason=reason,
    )

    if not awarded:
        # Duplicate detected inside award_xp (race) — nothing else to do.
        return False, 0, progress

    # New award → update the counters, streak and practice minutes.
    today = _today_str()
    if progress.last_completed_date != today:
        progress.daily_practice_minutes = 0
        progress.daily_conversations = 0
        progress.daily_lessons = 0
        progress.daily_quizzes = 0

    progress.current_streak = _compute_streak(
        progress.current_streak, progress.last_completed_date, today
    )
    progress.last_completed_date = today

    if is_lesson:
        progress.completed_lessons += 1
        progress.daily_lessons += 1
    # Every completion (lesson or free-form) counts as a conversation.
    progress.completed_conversations += 1
    progress.daily_conversations += 1

    duration_min = max(0, duration_seconds) // 60
    progress.total_practice_minutes += duration_min
    progress.daily_practice_minutes += duration_min

    db.add(progress)
    db.commit()
    db.refresh(progress)

    # Module M12 — keep the Statistics Dashboard's daily_activity snapshot in
    # sync. Recomputed (not incremented) from the source tables, so this is
    # safe even if called more than once for the same day.
    recompute_day(db, user_id=user_id, activity_date=today)

    return True, xp_awarded, progress


def get_quiz_xp(db: Session, user_id: int, quiz_id: int) -> int:
    """Return the total XP awarded for completing a single quiz.

    Phase 11 — Assessment (Quiz) Module.

    Queries the ``xp_awards`` ledger for the quiz source tied to this quiz id
    (the award ``reference`` is ``str(quiz_id)``). Returns ``0`` when no award
    exists (e.g. the quiz hasn't been completed yet, or all attempts scored
    below the threshold — though every attempt awards at least ``XP_QUIZ_LOW``).

    This lets the quiz history / stats surfaces show "XP earned" per quiz
    without duplicating the award logic — it simply reads the ledger that the
    completion flow already wrote to.
    """
    rows = (
        db.query(XpAward)
        .filter(
            XpAward.user_id == user_id,
            XpAward.reference == str(quiz_id),
            XpAward.source == SOURCE_QUIZ,
        )
        .all()
    )
    return sum(row.amount for row in rows)


def award_quiz_completion(
    db: Session,
    *,
    user_id: int,
    quiz_id: int,
    score_percent: int,
) -> tuple[bool, int, UserProgress]:
    """Award XP for completing a quiz (idempotent).

    Phase 11 — Assessment (Quiz) Module (Part 3 + Part 4).

    This is the function the quiz submission flow calls. It:

      1. Computes the XP via the rules engine (:func:`calculate_quiz_xp`)
         — tiered by score percentage.
      2. Delegates to :func:`award_xp` with ``source="quiz"`` and
         ``reference=str(quiz_id)``. The unique constraint guarantees XP is
         awarded **exactly once** per quiz — retaking the same quiz is a no-op
         for XP (the attempt row is still recorded, but ``xp_earned`` is 0).
      3. When the award is new, updates the quiz counters on the aggregate
         :class:`UserProgress` row (``completed_quizzes``,
         ``average_quiz_score``, ``latest_quiz_score``) and the streak.

    Returns ``(awarded, xp_awarded, progress)``. When the award is a duplicate,
    ``awarded`` is ``False`` and ``xp_awarded`` is 0 — the progress row is
    returned unchanged (the caller still records the attempt row with
    ``xp_earned=0``).
    """
    source = SOURCE_QUIZ
    reference = str(quiz_id)

    # Duplicate check first so we never recompute counters for an
    # already-awarded quiz.
    if _has_award(db, user_id, source, reference):
        progress = get_or_create_progress(db, user_id)
        return False, 0, progress

    amount = calculate_quiz_xp(score_percent=score_percent)
    reason = f"Quiz complete ({score_percent}% → +{amount} XP)"

    awarded, xp_awarded, progress = award_xp(
        db,
        user_id=user_id,
        source=source,
        reference=reference,
        amount=amount,
        reason=reason,
    )

    if not awarded:
        # Duplicate detected inside award_xp (race) — nothing else to do.
        return False, 0, progress

    # New award → update the quiz counters and streak.
    today = _today_str()
    if progress.last_completed_date != today:
        progress.daily_practice_minutes = 0
        progress.daily_conversations = 0
        progress.daily_lessons = 0
        progress.daily_quizzes = 0

    progress.current_streak = _compute_streak(
        progress.current_streak, progress.last_completed_date, today
    )
    progress.last_completed_date = today

    progress.completed_quizzes += 1
    progress.daily_quizzes += 1
    progress.latest_quiz_score = score_percent
    # Recompute the running average across all awarded quizzes.
    total = progress.completed_quizzes
    if total > 0:
        progress.average_quiz_score = round(
            (progress.average_quiz_score * (total - 1) + score_percent) / total
        )

    db.add(progress)
    db.commit()
    db.refresh(progress)

    # Module M12 — keep the Statistics Dashboard's daily_activity snapshot in
    # sync. Recomputed (not incremented) from the source tables, so this is
    # safe even if called more than once for the same day.
    recompute_day(db, user_id=user_id, activity_date=today)

    return True, xp_awarded, progress


__all__ = [
    "SOURCE_LESSON",
    "SOURCE_CONVERSATION",
    "SOURCE_QUIZ",
    "get_progress",
    "get_or_create_progress",
    "get_conversation_xp",
    "get_quiz_xp",
    "to_response",
    "award_xp",
    "award_conversation_completion",
    "award_quiz_completion",
]
