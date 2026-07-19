"""Pydantic schemas for the Lesson Assessment (Quiz) endpoints.

Phase 11 — Assessment (Quiz) Module.

These models drive request/response validation for the ``/api/v1/quizzes``
routes. The response schemas are intentionally rich so the frontend can
render the quiz, the results screen, and the history from a single read
without re-computing scores or XP on the client.

Key design decisions:
  * The "get quiz" response hides the correct answer index so a learner
    cannot cheat by inspecting the network response. The correct answers
    are only revealed in the "quiz result" response after submission.
  * The submit payload carries the learner's selected option indices
    (aligned with question display order). The backend grades the attempt,
    awards XP (idempotently), and returns the full result.
  * The result response includes per-question correctness and explanations
    so the results screen can show a detailed review.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------- #
# Question schemas
# --------------------------------------------------------------------- #


class QuestionPublic(BaseModel):
    """A quiz question as shown to the learner (correct answer hidden).

    The ``correct_answer_index`` is deliberately omitted so the learner
    cannot peek at the answer before submitting. The frontend renders the
    ``options`` as selectable choices.

    Phase 11 Part 10 — ``question_type`` identifies the question format
    (default ``"mcq"``). The built-in grader handles single-choice MCQ;
    future types can be rendered/graded differently on the frontend.
    """

    id: int
    question_text: str
    options: List[str]
    display_order: int
    points: int = 1
    question_type: str = "mcq"

    class Config:
        from_attributes = True


class QuestionReview(BaseModel):
    """A quiz question as shown on the results review screen.

    Includes the correct answer index, the learner's selected index, and
    whether the answer was correct, plus the explanation.

    Phase 11 Part 10 — ``question_type`` is surfaced so the review screen
    can render future question types appropriately.
    """

    id: int
    question_text: str
    options: List[str]
    correct_answer_index: int
    selected_answer_index: Optional[int] = None
    is_correct: bool
    explanation: Optional[str] = None
    display_order: int
    question_type: str = "mcq"


# --------------------------------------------------------------------- #
# Quiz schemas
# --------------------------------------------------------------------- #


class QuizSummary(BaseModel):
    """Lightweight quiz info (used in lists / "has quiz?" checks)."""

    id: int
    lesson_id: str
    title: str
    description: Optional[str] = None
    difficulty: str = "Beginner"
    passing_score_percent: int = 50
    question_count: int = 0

    class Config:
        from_attributes = True


class QuizDetail(BaseModel):
    """Full quiz with questions (correct answers hidden) for the learner.

    Returned by ``GET /api/v1/quizzes/lesson/{lesson_id}``. The
    ``question_count`` is derived from the questions list.
    """

    id: int
    lesson_id: str
    title: str
    description: Optional[str] = None
    difficulty: str = "Beginner"
    passing_score_percent: int = 50
    questions: List[QuestionPublic] = []

    class Config:
        from_attributes = True


# --------------------------------------------------------------------- #
# Submit / result schemas
# --------------------------------------------------------------------- #


class QuizSubmitRequest(BaseModel):
    """Payload for submitting a quiz attempt.

    ``answers`` is a list of selected option indices (0-based), aligned
    with the question display order. A ``null`` entry means the learner
    skipped that question (graded as incorrect).
    """

    answers: List[Optional[int]] = Field(
        ..., min_length=1, max_length=50
    )


class QuizResultResponse(BaseModel):
    """Full result of a quiz submission.

    Includes the score, percentage, XP earned, pass/fail, and a per-question
    review so the results screen can show a detailed breakdown. The
    ``xp_awarded`` flag indicates whether this attempt triggered a new XP
    grant (False on retakes — the ledger awards once per quiz).
    """

    attempt_id: int
    quiz_id: int
    lesson_id: str
    quiz_title: str
    score: int
    total_questions: int
    percentage: int
    xp_earned: int
    xp_awarded: bool
    passed: bool
    review: List[QuestionReview] = []
    completed_at: datetime


# --------------------------------------------------------------------- #
# Attempt history schemas
# --------------------------------------------------------------------- #


class QuizAttemptSummary(BaseModel):
    """A single past quiz attempt (used in the history / stats list)."""

    id: int
    quiz_id: int
    lesson_id: str
    quiz_title: str
    score: int
    total_questions: int
    percentage: int
    xp_earned: int
    completed_at: datetime

    class Config:
        from_attributes = True


class QuizStatsResponse(BaseModel):
    """Aggregate quiz statistics for the authenticated user.

    Returned by ``GET /api/v1/quizzes/stats``. Powers the dashboard and
    statistics page quiz analytics. All values are computed server-side
    from the ``quiz_attempts`` table so the frontend renders in a single
    read.
    """

    total_attempts: int
    completed_quizzes: int
    average_score: int
    latest_score: int
    highest_score: int
    total_xp_from_quizzes: int


__all__ = [
    "QuestionPublic",
    "QuestionReview",
    "QuizSummary",
    "QuizDetail",
    "QuizSubmitRequest",
    "QuizResultResponse",
    "QuizAttemptSummary",
    "QuizStatsResponse",
]
