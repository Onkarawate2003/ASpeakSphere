"""SQLAlchemy models for the Lesson Assessment (Quiz) system.

Phase 11 — Assessment (Quiz) Module.

Three tables are introduced:

* ``quizzes`` — a quiz is linked to a lesson via ``lesson_id`` (the stable
  string id from the frontend lesson catalog in ``lessonsData.ts``). A quiz
  has a title, description, difficulty, a passing-score threshold and an
  active flag. One quiz per lesson (enforced by a unique constraint on
  ``lesson_id``).

* ``quiz_questions`` — the MCQ questions belonging to a quiz. Each question
  has four options (stored as a JSON array in a ``Text`` column), the
  0-based index of the correct answer, an optional explanation, a display
  order and a point value. Deleting a quiz cascades to its questions.

* ``quiz_attempts`` — one row per attempt (a learner may retake a quiz;
  each attempt is a new row). Stores the score (correct count), total
  questions, percentage, XP earned and the selected answers (JSON). XP is
  awarded **exactly once** per quiz via the ``xp_awards`` ledger
  (``source="quiz"``, ``reference=str(quiz_id)``) — see
  :func:`app.crud.progress.award_quiz_completion`.

The models are intentionally generic (MCQ with 4 options, 1 correct) so
future assessment types (Grammar, Vocabulary, Pronunciation, Listening,
Adaptive AI Quiz, Speaking Assessment) can plug in without redesign —
they simply create quizzes with their own ``lesson_id`` values and
question content.
"""

import json
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Quiz(Base):
    """A lesson assessment quiz.

    Linked to a lesson via ``lesson_id`` (the stable string id from the
    frontend lesson catalog). One quiz per lesson — the unique constraint
    ``uq_quizzes_lesson_id`` enforces this so seeding is idempotent.
    """

    __tablename__ = "quizzes"
    __table_args__ = (
        UniqueConstraint("lesson_id", name="uq_quizzes_lesson_id"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # The lesson this quiz assesses. Matches the `id` field in the frontend
    # lesson catalog (e.g. "speaking-introductions").
    lesson_id = Column(String(80), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Beginner | Intermediate | Advanced — mirrors the frontend Difficulty.
    difficulty = Column(String(24), nullable=False, default="Beginner")

    # Minimum percentage required to "pass" (default 50). Used for display
    # badges; XP is awarded regardless of pass/fail (tiered by score).
    passing_score_percent = Column(Integer, nullable=False, default=50)

    # Soft-delete / draft support. Inactive quizzes are hidden from learners.
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # One-to-many: a quiz owns many questions. Deleting a quiz cascades.
    questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.display_order",
    )

    # One-to-many: a quiz has many attempts across all learners.
    attempts = relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<Quiz id={self.id} lesson_id={self.lesson_id!r} "
            f"title={self.title!r}>"
        )


class QuizQuestion(Base):
    """A single question within a quiz.

    Options are stored as a JSON-encoded array of strings in a ``Text``
    column (e.g. ``'["Option A", "Option B", "Option C", "Option D"]'``).
    This avoids a separate options table while keeping the data structured
    and safe for options that may contain commas or newlines.

    ``correct_answer_index`` is the 0-based index into the options array.
    ``explanation`` is shown on the results screen after submission.

    Phase 11 Part 10 — Future compatibility. ``question_type`` identifies
    the question format so the system can grow beyond single-choice MCQ
    without a schema redesign. The built-in grader currently handles
    ``"mcq"`` (single correct answer); future types such as ``"true_false"``,
    ``"multiple_select"`` or ``"short_answer"`` can be added by extending
    the grader in :mod:`app.crud.quizzes` and seeding questions with the
    new type — no migration needed because the column already exists.
    """

    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_text = Column(Text, nullable=False)

    # Phase 11 Part 10 — Question format identifier. Defaults to "mcq"
    # (single-choice, one correct answer). Future types plug in here.
    question_type = Column(String(24), nullable=False, default="mcq")

    # JSON array of option strings, e.g. '["Yes", "No", "Maybe", "Never"]'.
    options = Column(Text, nullable=False)

    # 0-based index of the correct option.
    correct_answer_index = Column(Integer, nullable=False)

    explanation = Column(Text, nullable=True)

    # Ordering within the quiz (1-based for display).
    display_order = Column(Integer, nullable=False, default=1)

    # Points awarded for a correct answer (default 1). Allows weighted
    # questions in future without schema changes.
    points = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    quiz = relationship("Quiz", back_populates="questions")

    def get_options(self) -> List[str]:
        """Decode the JSON options array into a Python list."""
        try:
            data = json.loads(self.options)
            if isinstance(data, list):
                return [str(item) for item in data]
        except (json.JSONDecodeError, TypeError):
            pass
        return []

    def set_options(self, options: List[str]) -> None:
        """Encode a Python list of options into the JSON ``Text`` column."""
        self.options = json.dumps(options)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<QuizQuestion id={self.id} quiz_id={self.quiz_id} "
            f"order={self.display_order}>"
        )


class QuizAttempt(Base):
    """A single quiz attempt by a learner.

    A learner may retake a quiz — each attempt is a new row. XP is awarded
    exactly once per quiz via the ``xp_awards`` ledger (not here), so
    ``xp_earned`` on the *first* passing attempt records the amount and
    subsequent attempts record 0 (the ledger prevents double-awarding).

    ``answers`` is a JSON array of the selected option indices (0-based),
    aligned with the question display order, so the results screen can show
    which questions were answered correctly.
    """

    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Number of correct answers.
    score = Column(Integer, nullable=False)

    # Total number of questions in the quiz at the time of the attempt.
    total_questions = Column(Integer, nullable=False)

    # Percentage score (0–100), rounded.
    percentage = Column(Integer, nullable=False)

    # XP earned from this attempt (0 for retakes — the ledger awards once).
    xp_earned = Column(Integer, nullable=False, default=0)

    # JSON array of selected option indices, e.g. '[0, 2, 1, 3]'.
    answers = Column(Text, nullable=True)

    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")

    def get_answers(self) -> List[int]:
        """Decode the JSON answers array into a Python list of indices."""
        try:
            data = json.loads(self.answers) if self.answers else []
            if isinstance(data, list):
                return [int(item) for item in data]
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
        return []

    def set_answers(self, answers: List[int]) -> None:
        """Encode a Python list of selected indices into the JSON column."""
        self.answers = json.dumps(answers)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<QuizAttempt id={self.id} user_id={self.user_id} "
            f"quiz_id={self.quiz_id} score={self.score}/{self.total_questions} "
            f"pct={self.percentage}%>"
        )


__all__ = ["Quiz", "QuizQuestion", "QuizAttempt"]
