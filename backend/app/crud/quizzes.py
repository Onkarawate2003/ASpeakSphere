"""CRUD operations for the Lesson Assessment (Quiz) system.

Phase 11 — Assessment (Quiz) Module.

All functions expect an open SQLAlchemy ``Session`` and are scoped to a
``user_id`` (supplied by the authenticated user in the API layer).

The central function is :func:`submit_quiz_attempt`, called by the quiz
submission endpoint. It:

  1. Loads the quiz and its questions (ordered by ``display_order``).
  2. Grades the learner's answers against the correct answer indices.
  3. Records a :class:`QuizAttempt` row (score, percentage, answers).
  4. Awards XP via :func:`app.crud.progress.award_quiz_completion`
     (idempotent — exactly once per quiz).
  5. Returns the attempt plus the per-question review.

The grading and XP logic live here (CRUD) so the API layer stays thin,
mirroring the conversation completion pattern.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.crud.progress import award_quiz_completion, get_quiz_xp
from app.models.quizzes import Quiz, QuizAttempt, QuizQuestion
from app.schemas.quizzes import (
    QuestionPublic,
    QuestionReview,
    QuizAttemptSummary,
    QuizDetail,
    QuizResultResponse,
    QuizStatsResponse,
    QuizSummary,
)


# --------------------------------------------------------------------- #
# Read helpers
# --------------------------------------------------------------------- #


def get_quiz_by_lesson(db: Session, lesson_id: str) -> Optional[Quiz]:
    """Return the active quiz for a lesson, or ``None`` if none exists."""
    return (
        db.query(Quiz)
        .filter(Quiz.lesson_id == lesson_id, Quiz.is_active.is_(True))
        .first()
    )


def get_quiz_by_id(db: Session, quiz_id: int) -> Optional[Quiz]:
    """Return a quiz by its primary key (active only)."""
    return (
        db.query(Quiz)
        .filter(Quiz.id == quiz_id, Quiz.is_active.is_(True))
        .first()
    )


def quiz_to_detail(quiz: Quiz) -> QuizDetail:
    """Build a :class:`QuizDetail` (correct answers hidden) from a Quiz row."""
    return QuizDetail(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        title=quiz.title,
        description=quiz.description,
        difficulty=quiz.difficulty,
        passing_score_percent=quiz.passing_score_percent,
        questions=[
            QuestionPublic(
                id=q.id,
                question_text=q.question_text,
                options=q.get_options(),
                display_order=q.display_order,
                points=q.points,
                question_type=q.question_type,
            )
            for q in quiz.questions
        ],
    )


def quiz_to_summary(quiz: Quiz) -> QuizSummary:
    """Build a lightweight :class:`QuizSummary` from a Quiz row."""
    return QuizSummary(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        title=quiz.title,
        description=quiz.description,
        difficulty=quiz.difficulty,
        passing_score_percent=quiz.passing_score_percent,
        question_count=len(quiz.questions),
    )


# --------------------------------------------------------------------- #
# Attempt helpers
# --------------------------------------------------------------------- #


def get_user_attempts(
    db: Session,
    user_id: int,
    *,
    skip: int = 0,
    limit: int = 50,
) -> List[QuizAttempt]:
    """Return the user's quiz attempts, newest first."""
    return (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.completed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_latest_attempt(
    db: Session,
    user_id: int,
    quiz_id: int,
) -> Optional[QuizAttempt]:
    """Return the user's most recent attempt for a specific quiz."""
    return (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.quiz_id == quiz_id,
        )
        .order_by(QuizAttempt.completed_at.desc())
        .first()
    )


def attempt_to_summary(attempt: QuizAttempt, quiz: Quiz) -> QuizAttemptSummary:
    """Build a :class:`QuizAttemptSummary` from an attempt + its quiz."""
    return QuizAttemptSummary(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        lesson_id=quiz.lesson_id,
        quiz_title=quiz.title,
        score=attempt.score,
        total_questions=attempt.total_questions,
        percentage=attempt.percentage,
        xp_earned=attempt.xp_earned,
        completed_at=attempt.completed_at,
    )


# --------------------------------------------------------------------- #
# Submit / grade
# --------------------------------------------------------------------- #


def submit_quiz_attempt(
    db: Session,
    *,
    user_id: int,
    quiz: Quiz,
    answers: List[Optional[int]],
) -> Tuple[QuizAttempt, bool, int]:
    """Grade a quiz submission, record the attempt, and award XP.

    Phase 11 — Assessment (Quiz) Module.

    Steps:
      1. Align the submitted answers with the quiz questions (ordered by
         ``display_order``). Missing/trailing answers are treated as
         incorrect (``None``).
      2. Count correct answers and compute the percentage.
      3. Insert a :class:`QuizAttempt` row.
      4. Award XP via :func:`award_quiz_completion` (idempotent — exactly
         once per quiz). The attempt's ``xp_earned`` records the amount on
         the first awarding attempt and 0 on retakes.
      5. Return ``(attempt, awarded, xp_awarded)``.

    The caller (API layer) builds the :class:`QuizResultResponse` from the
    attempt and the per-question review via :func:`build_review`.
    """
    questions = sorted(quiz.questions, key=lambda q: q.display_order)
    total = len(questions)

    # Grade each question.
    correct = 0
    for i, question in enumerate(questions):
        selected = answers[i] if i < len(answers) else None
        if selected is not None and selected == question.correct_answer_index:
            correct += 1

    percentage = round((correct / total) * 100) if total > 0 else 0

    # Award XP (idempotent). ``awarded`` is True only on the first attempt
    # that triggers a new XP grant.
    awarded, xp_awarded, _progress = award_quiz_completion(
        db,
        user_id=user_id,
        quiz_id=quiz.id,
        score_percent=percentage,
    )

    # Record the attempt. ``xp_earned`` reflects what this attempt actually
    # granted (0 on retakes because the ledger already awarded the quiz).
    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz.id,
        score=correct,
        total_questions=total,
        percentage=percentage,
        xp_earned=xp_awarded,
        answers=json.dumps(answers),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return attempt, awarded, xp_awarded


def build_review(
    quiz: Quiz,
    answers: List[Optional[int]],
) -> List[QuestionReview]:
    """Build the per-question review for the results screen.

    For each question: the correct answer index, the learner's selected
    index, whether it was correct, and the explanation.
    """
    questions = sorted(quiz.questions, key=lambda q: q.display_order)
    review: List[QuestionReview] = []
    for i, question in enumerate(questions):
        selected = answers[i] if i < len(answers) else None
        is_correct = (
            selected is not None
            and selected == question.correct_answer_index
        )
        review.append(
            QuestionReview(
                id=question.id,
                question_text=question.question_text,
                options=question.get_options(),
                correct_answer_index=question.correct_answer_index,
                selected_answer_index=selected,
                is_correct=is_correct,
                explanation=question.explanation,
                display_order=question.display_order,
                question_type=question.question_type,
            )
        )
    return review


def build_result_response(
    attempt: QuizAttempt,
    quiz: Quiz,
    answers: List[Optional[int]],
    awarded: bool,
) -> QuizResultResponse:
    """Build the full :class:`QuizResultResponse` from a graded attempt."""
    review = build_review(quiz, answers)
    passed = attempt.percentage >= quiz.passing_score_percent
    return QuizResultResponse(
        attempt_id=attempt.id,
        quiz_id=attempt.quiz_id,
        lesson_id=quiz.lesson_id,
        quiz_title=quiz.title,
        score=attempt.score,
        total_questions=attempt.total_questions,
        percentage=attempt.percentage,
        xp_earned=attempt.xp_earned,
        xp_awarded=awarded,
        passed=passed,
        review=review,
        completed_at=attempt.completed_at,
    )


# --------------------------------------------------------------------- #
# Stats
# --------------------------------------------------------------------- #


def get_quiz_stats(db: Session, user_id: int) -> QuizStatsResponse:
    """Compute aggregate quiz statistics for the authenticated user.

    Powers the dashboard and statistics page quiz analytics. All values are
    computed from the ``quiz_attempts`` table (and the ``xp_awards`` ledger
    for total XP) so the frontend renders in a single read.
    """
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.completed_at.desc())
        .all()
    )

    total_attempts = len(attempts)
    if total_attempts == 0:
        return QuizStatsResponse(
            total_attempts=0,
            completed_quizzes=0,
            average_score=0,
            latest_score=0,
            highest_score=0,
            total_xp_from_quizzes=0,
        )

    # Distinct quizzes attempted (completed_quizzes = distinct quiz ids).
    distinct_quiz_ids = {a.quiz_id for a in attempts}
    completed_quizzes = len(distinct_quiz_ids)

    percentages = [a.percentage for a in attempts]
    average_score = round(sum(percentages) / total_attempts)
    latest_score = attempts[0].percentage  # already ordered desc
    highest_score = max(percentages)

    # Total XP from quizzes — read from the ledger (idempotent, accurate).
    total_xp = 0
    for quiz_id in distinct_quiz_ids:
        total_xp += get_quiz_xp(db, user_id, quiz_id)

    return QuizStatsResponse(
        total_attempts=total_attempts,
        completed_quizzes=completed_quizzes,
        average_score=average_score,
        latest_score=latest_score,
        highest_score=highest_score,
        total_xp_from_quizzes=total_xp,
    )


__all__ = [
    "get_quiz_by_lesson",
    "get_quiz_by_id",
    "quiz_to_detail",
    "quiz_to_summary",
    "get_user_attempts",
    "get_latest_attempt",
    "attempt_to_summary",
    "submit_quiz_attempt",
    "build_review",
    "build_result_response",
    "get_quiz_stats",
]
