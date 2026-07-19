"""Lesson Assessment (Quiz) endpoints.

Phase 11 — Assessment (Quiz) Module.

All routes are mounted under ``/api/v1/quizzes`` (see ``main.py``) and
require authentication via ``get_current_user``. Every read/write is scoped
to the authenticated user so a learner can only access their own attempts.

Endpoints
---------
* ``GET /api/v1/quizzes/lesson/{lesson_id}`` — return the active quiz for a
  lesson (questions with correct answers hidden) so the learner can take it.
* ``POST /api/v1/quizzes/{quiz_id}/submit`` — grade a quiz submission, record
  the attempt, award XP (idempotent — exactly once per quiz), and return the
  full result with a per-question review.
* ``GET /api/v1/quizzes/{quiz_id}/latest`` — return the learner's most recent
  attempt for a quiz (used to show "previous attempt" / retake context).
* ``GET /api/v1/quizzes/history`` — return the learner's quiz attempt history
  (newest first).
* ``GET /api/v1/quizzes/stats`` — return aggregate quiz statistics for the
  dashboard / statistics page.

The grading, XP awarding, and progress bookkeeping all live in the CRUD layer
(``app.crud.quizzes`` + ``app.crud.progress.award_quiz_completion``) so the
API layer stays thin, mirroring the conversation completion pattern.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.crud.quizzes import (
    attempt_to_summary,
    build_result_response,
    get_latest_attempt,
    get_quiz_by_id,
    get_quiz_by_lesson,
    get_quiz_stats,
    get_user_attempts,
    quiz_to_detail,
    submit_quiz_attempt,
)
from app.database import get_db
from app.models.quizzes import Quiz
from app.models.users import User
from app.schemas.quizzes import (
    QuizAttemptSummary,
    QuizDetail,
    QuizResultResponse,
    QuizStatsResponse,
    QuizSubmitRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def _get_quiz_or_404(quiz_id: int, db: Session) -> Quiz:
    """Resolve an active quiz by id or raise 404.

    A missing/inactive quiz resolves to 404 (not 403) so existence of quizzes
    is never leaked — mirroring the conversation ownership helper.
    """
    quiz = get_quiz_by_id(db, quiz_id=quiz_id)
    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found.",
        )
    return quiz


@router.get("/lesson/{lesson_id}", response_model=QuizDetail)
def get_quiz_for_lesson(
    lesson_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizDetail:
    """Return the active quiz for a lesson (correct answers hidden).

    The quiz is the natural next step after completing the AI conversation
    practice for a lesson. The response includes the questions and their
    options but deliberately omits ``correct_answer_index`` so the learner
    cannot cheat by inspecting the network response. Correct answers are only
    revealed in the ``POST /{quiz_id}/submit`` result.
    """
    quiz = get_quiz_by_lesson(db, lesson_id=lesson_id)
    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quiz available for this lesson.",
        )
    return quiz_to_detail(quiz)


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz(
    quiz_id: int,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizResultResponse:
    """Grade a quiz submission, record the attempt, and award XP.

    The learner's ``answers`` (option indices aligned to question display
    order) are graded against the correct answer indices. A ``null`` entry
    means the question was skipped (graded as incorrect).

    XP is awarded **idempotently** — exactly once per quiz, regardless of how
    many times the learner retakes it. The amount depends on the score:

      * ``< 50%``   → +10 XP
      * ``50–79%``  → +25 XP
      * ``80–100%`` → +50 XP

    The response includes the score, percentage, XP earned, pass/fail, and a
    per-question review (correct answer, selected answer, correctness,
    explanation) so the results screen can show a detailed breakdown.
    """
    quiz = _get_quiz_or_404(quiz_id, db)

    # The schema caps answers at 50 entries; extra trailing entries beyond the
    # question count are ignored during grading (see submit_quiz_attempt).
    answers = payload.answers

    attempt, awarded, xp_awarded = submit_quiz_attempt(
        db,
        user_id=current_user.id,
        quiz=quiz,
        answers=answers,
    )

    if awarded:
        logger.info(
            "Quiz %s completed by user %s — %d/%d (%d%%) → +%d XP",
            quiz.id,
            current_user.id,
            attempt.score,
            attempt.total_questions,
            attempt.percentage,
            xp_awarded,
        )
    else:
        logger.info(
            "Quiz %s retaken by user %s — %d/%d (%d%%) (XP already awarded)",
            quiz.id,
            current_user.id,
            attempt.score,
            attempt.total_questions,
            attempt.percentage,
        )

    return build_result_response(attempt, quiz, answers, awarded)


@router.get("/{quiz_id}/latest", response_model=QuizAttemptSummary)
def get_previous_attempt(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizAttemptSummary:
    """Return the learner's most recent attempt for a quiz.

    Used to show "previous attempt" context before a retake (e.g. "You scored
    75% last time"). Returns 404 if the learner has never attempted this quiz.
    """
    quiz = _get_quiz_or_404(quiz_id, db)
    attempt = get_latest_attempt(db, user_id=current_user.id, quiz_id=quiz.id)
    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No previous attempt found for this quiz.",
        )
    return attempt_to_summary(attempt, quiz)


@router.get("/history", response_model=List[QuizAttemptSummary])
def list_quiz_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[QuizAttemptSummary]:
    """Return the learner's quiz attempt history (newest first).

    Each entry summarises a single attempt (quiz title, score, percentage, XP,
    completed_at). The frontend renders this inside the Statistics / Progress
    area — the Conversation History page is unchanged.
    """
    attempts = get_user_attempts(db, user_id=current_user.id, limit=100)
    summaries: List[QuizAttemptSummary] = []
    for attempt in attempts:
        quiz = attempt.quiz
        if quiz is None:
            # Defensive: skip orphaned attempts (quiz deleted/inactive).
            continue
        summaries.append(attempt_to_summary(attempt, quiz))
    return summaries


@router.get("/stats", response_model=QuizStatsResponse)
def get_quiz_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizStatsResponse:
    """Return aggregate quiz statistics for the authenticated user.

    Powers the dashboard and statistics page quiz analytics. All values are
    computed server-side from the ``quiz_attempts`` table (and the
    ``xp_awards`` ledger for total XP) so the frontend renders in a single
    read.
    """
    return get_quiz_stats(db, user_id=current_user.id)


__all__ = ["router"]
