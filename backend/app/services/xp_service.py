"""XP rules engine and level calculation logic.

Phase 10 — Progress Tracking & XP System.

This module is the **single source of truth** for how XP is calculated and
how levels are derived. It is intentionally framework-agnostic (no
SQLAlchemy, no FastAPI) so it can be unit-tested in isolation and reused by
any future module that needs to award XP.

XP RULES (Part 3)
-----------------
* Complete Lesson ............ +50 XP
* Complete Conversation ...... +20 XP
* Conversation > 5 minutes ... +15 XP  (in addition to the base)
* Conversation > 10 minutes .. +30 XP  (replaces the 5-minute bonus — only
  the single highest duration bonus applies, never both)
* First lesson of the day .... +10 XP
* Maximum XP per lesson ...... 100 XP  (the sum is clamped)

Duplicate prevention is handled at the persistence layer (the
``xp_awards`` unique constraint) — see ``app.crud.progress.award_xp``.

LEVELS (Part 4)
---------------
Levels are derived from cumulative XP thresholds:

    Level 1 →     0 XP
    Level 2 →   100 XP
    Level 3 →   250 XP
    Level 4 →   450 XP
    Level 5 →   700 XP
    Level 6 →  1000 XP
    Level 7 →  1350 XP
    ...

The gap between consecutive levels grows by 50 XP each step after the
first few hand-tuned thresholds, so the curve continues naturally without
a hard cap. ``level_for_xp`` computes the level for any XP value, and
``level_thresholds`` exposes the table for the dashboard progress bar.
"""

from dataclasses import dataclass
from typing import List

# --------------------------------------------------------------------- #
# XP amounts (Part 3)
# --------------------------------------------------------------------- #

#: Base XP for completing a lesson (a lesson is a guided conversation).
XP_LESSON_COMPLETE = 50

#: Base XP for completing any conversation (lesson or free-form).
XP_CONVERSATION_COMPLETE = 20

#: Bonus XP when a conversation lasts longer than 5 minutes.
XP_DURATION_5_MIN = 15

#: Bonus XP when a conversation lasts longer than 10 minutes. This is the
#: single highest duration bonus — it replaces the 5-minute bonus rather
#: than stacking on top of it.
XP_DURATION_10_MIN = 30

#: Bonus XP for the first lesson completed on a given calendar day.
XP_FIRST_LESSON_OF_DAY = 10

#: Hard cap on the total XP a single lesson completion can grant.
MAX_XP_PER_LESSON = 100

#: Duration thresholds in seconds (5 min / 10 min).
DURATION_5_MIN_SECONDS = 5 * 60
DURATION_10_MIN_SECONDS = 10 * 60

# --------------------------------------------------------------------- #
# Phase 11 — Quiz assessment XP (Part 3).
#
# XP is tiered by the quiz score percentage so a higher score earns more,
# but every completed attempt earns at least some XP (encouraging practice).
# --------------------------------------------------------------------- #

#: XP for a quiz attempt scoring below 50% (encouragement — still practised).
XP_QUIZ_LOW = 10

#: XP for a quiz attempt scoring 50–79%.
XP_QUIZ_MEDIUM = 25

#: XP for a quiz attempt scoring 80–100%.
XP_QUIZ_HIGH = 50

#: Score percentage thresholds.
QUIZ_SCORE_MEDIUM = 50
QUIZ_SCORE_HIGH = 80


@dataclass(frozen=True)
class XpBreakdown:
    """Detailed breakdown of the XP awarded for a single completion.

    Returned by :func:`calculate_lesson_xp` so the caller (and future
    activity feeds) can show *why* a given amount was awarded.
    """

    total: int
    base_lesson: int
    base_conversation: int
    duration_bonus: int
    first_of_day_bonus: int
    clamped: bool


def _duration_bonus(duration_seconds: int) -> int:
    """Return the single highest applicable duration bonus.

    A conversation longer than 10 minutes earns ``XP_DURATION_10_MIN`` (not
    ``XP_DURATION_10_MIN + XP_DURATION_5_MIN``). A conversation longer than
    5 minutes (but not 10) earns ``XP_DURATION_5_MIN``.
    """
    if duration_seconds > DURATION_10_MIN_SECONDS:
        return XP_DURATION_10_MIN
    if duration_seconds > DURATION_5_MIN_SECONDS:
        return XP_DURATION_5_MIN
    return 0


def calculate_lesson_xp(
    *,
    duration_seconds: int,
    is_first_lesson_of_day: bool,
) -> XpBreakdown:
    """Compute the XP for completing a lesson conversation.

    A "lesson" in this system is a guided conversation tied to a lesson
    (``lesson_id`` is set). Completing it grants:

      * the lesson base (``XP_LESSON_COMPLETE``)
      * the conversation base (``XP_CONVERSATION_COMPLETE``)
      * the single highest duration bonus
      * the first-lesson-of-day bonus (when applicable)

    The sum is clamped to ``MAX_XP_PER_LESSON``.

    Args:
        duration_seconds: The conversation duration in seconds.
        is_first_lesson_of_day: Whether this is the first lesson completed
            on the current calendar day (streak/date logic is handled by
            the caller — this function is pure).

    Returns:
        An :class:`XpBreakdown` with the total and per-component amounts.
    """
    base_lesson = XP_LESSON_COMPLETE
    base_conversation = XP_CONVERSATION_COMPLETE
    duration_bonus = _duration_bonus(max(0, duration_seconds))
    first_of_day_bonus = XP_FIRST_LESSON_OF_DAY if is_first_lesson_of_day else 0

    raw_total = (
        base_lesson + base_conversation + duration_bonus + first_of_day_bonus
    )
    clamped_total = min(raw_total, MAX_XP_PER_LESSON)

    return XpBreakdown(
        total=clamped_total,
        base_lesson=base_lesson,
        base_conversation=base_conversation,
        duration_bonus=duration_bonus,
        first_of_day_bonus=first_of_day_bonus,
        clamped=clamped_total < raw_total,
    )


def calculate_conversation_xp(*, duration_seconds: int) -> int:
    """Compute the XP for completing a free-form (non-lesson) conversation.

    Free-form conversations (no ``lesson_id``) earn the conversation base
    plus the single highest duration bonus. There is no lesson base and no
    first-of-day bonus (those are lesson-specific). No clamp applies
    because the maximum here is 20 + 30 = 50 XP.
    """
    base = XP_CONVERSATION_COMPLETE
    duration_bonus = _duration_bonus(max(0, duration_seconds))
    return base + duration_bonus


def calculate_quiz_xp(*, score_percent: int) -> int:
    """Compute the XP for a quiz attempt based on the score percentage.

    Phase 11 — Assessment (Quiz) Module (Part 3).

    XP is tiered so a higher score earns more, but every completed attempt
    earns at least some XP to encourage practice:

      * Score < 50%  → ``XP_QUIZ_LOW``   (10 XP)
      * Score 50–79% → ``XP_QUIZ_MEDIUM`` (25 XP)
      * Score 80–100% → ``XP_QUIZ_HIGH``  (50 XP)

    The percentage is clamped to 0–100 defensively. The actual award is
    made idempotently by :func:`app.crud.progress.award_quiz_completion`
    via the ``xp_awards`` ledger (``source="quiz"``,
    ``reference=str(quiz_id)``) so XP is granted **exactly once** per quiz
    regardless of how many times the learner retakes it.
    """
    pct = max(0, min(100, score_percent))
    if pct >= QUIZ_SCORE_HIGH:
        return XP_QUIZ_HIGH
    if pct >= QUIZ_SCORE_MEDIUM:
        return XP_QUIZ_MEDIUM
    return XP_QUIZ_LOW


# --------------------------------------------------------------------- #
# Level calculation (Part 4)
# --------------------------------------------------------------------- #

#: Hand-tuned cumulative XP thresholds for the first five levels, matching
#: the spec exactly. Subsequent levels continue with a growing gap.
_BASE_LEVEL_THRESHOLDS: List[int] = [0, 100, 250, 450, 700]

#: The incremental gap added each level after the base table. The gap
#: itself grows by 50 XP per level so the curve steepens naturally.
_LEVEL_GAP_STEP = 50

#: The starting gap used once we exhaust the base table (level 5 → 6).
#: 1000 - 700 = 300, so the first generated gap is 300.
_FIRST_GENERATED_GAP = 300


def level_thresholds(up_to_level: int = 20) -> List[int]:
    """Return the cumulative XP required to *reach* each level.

    ``level_thresholds()[n]`` is the minimum XP for level ``n + 1`` (index
    0 → level 1, index 1 → level 2, …). The list always starts at 0 (level
    1 requires 0 XP).

    The first five entries mirror the spec (0, 100, 250, 450, 700). Beyond
    that the gap grows by 50 XP each level (300, 350, 400, …) so the curve
    continues indefinitely without a hard cap.
    """
    if up_to_level < 1:
        return [0]

    thresholds: List[int] = list(_BASE_LEVEL_THRESHOLDS)
    # Generate additional levels until we have ``up_to_level`` entries.
    gap = _FIRST_GENERATED_GAP
    while len(thresholds) < up_to_level:
        next_threshold = thresholds[-1] + gap
        thresholds.append(next_threshold)
        gap += _LEVEL_GAP_STEP
    return thresholds[:up_to_level]


def level_for_xp(total_xp: int) -> int:
    """Return the level for a given cumulative XP total.

    Level 1 covers 0–99 XP, level 2 covers 100–249 XP, etc. The level is
    the highest index ``i`` (1-based) such that
    ``level_thresholds(i)[i-1] <= total_xp``.

    The function generates thresholds lazily until it passes ``total_xp``,
    so it works for arbitrarily large XP values.
    """
    if total_xp < 0:
        return 1

    thresholds = level_thresholds()
    level = 1
    for i, threshold in enumerate(thresholds, start=1):
        if total_xp >= threshold:
            level = i
        else:
            break
    else:
        # We exhausted the precomputed table but total_xp is still >= the
        # last threshold — keep generating until we pass total_xp.
        gap = _FIRST_GENERATED_GAP + _LEVEL_GAP_STEP * (
            len(thresholds) - len(_BASE_LEVEL_THRESHOLDS)
        )
        last = thresholds[-1]
        while total_xp >= last:
            level += 1
            last += gap
            gap += _LEVEL_GAP_STEP
    return level


def xp_for_next_level(total_xp: int) -> int:
    """Return the cumulative XP required to reach the *next* level.

    Useful for the dashboard progress bar: the learner is at
    ``level_for_xp(total_xp)`` and needs ``xp_for_next_level(total_xp)``
    XP to advance.
    """
    current_level = level_for_xp(total_xp)
    thresholds = level_thresholds(current_level + 1)
    return thresholds[current_level]  # index current_level → next level


def level_progress(total_xp: int) -> "LevelProgress":
    """Return the progress within the current level for a given XP total.

    Provides ``current_level``, ``xp_into_level``, ``xp_for_next_level``
    and ``progress_percent`` (0–100) so the dashboard can render a level
    progress bar without duplicating the threshold math.
    """
    current_level = level_for_xp(total_xp)
    thresholds = level_thresholds(current_level + 1)
    current_level_start = thresholds[current_level - 1]
    next_level_start = thresholds[current_level]

    xp_into_level = total_xp - current_level_start
    xp_needed = next_level_start - current_level_start
    progress_percent = (
        round((xp_into_level / xp_needed) * 100, 1) if xp_needed > 0 else 100.0
    )
    return LevelProgress(
        current_level=current_level,
        current_level_start=current_level_start,
        next_level_start=next_level_start,
        xp_into_level=xp_into_level,
        xp_for_next_level=next_level_start,
        xp_needed_for_next=xp_needed,
        progress_percent=min(progress_percent, 100.0),
    )


@dataclass(frozen=True)
class LevelProgress:
    """Progress within the current level, for dashboard rendering."""

    current_level: int
    current_level_start: int
    next_level_start: int
    xp_into_level: int
    xp_for_next_level: int
    xp_needed_for_next: int
    progress_percent: float


__all__ = [
    "XP_LESSON_COMPLETE",
    "XP_CONVERSATION_COMPLETE",
    "XP_DURATION_5_MIN",
    "XP_DURATION_10_MIN",
    "XP_FIRST_LESSON_OF_DAY",
    "MAX_XP_PER_LESSON",
    "DURATION_5_MIN_SECONDS",
    "DURATION_10_MIN_SECONDS",
    "XP_QUIZ_LOW",
    "XP_QUIZ_MEDIUM",
    "XP_QUIZ_HIGH",
    "QUIZ_SCORE_MEDIUM",
    "QUIZ_SCORE_HIGH",
    "XpBreakdown",
    "calculate_lesson_xp",
    "calculate_conversation_xp",
    "calculate_quiz_xp",
    "level_thresholds",
    "level_for_xp",
    "xp_for_next_level",
    "level_progress",
    "LevelProgress",
]
