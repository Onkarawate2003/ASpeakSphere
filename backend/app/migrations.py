"""Idempotent schema migrations.

SQLAlchemy's ``Base.metadata.create_all()`` only creates *missing tables* —
it does **not** add columns to tables that already exist. When a model gains
new nullable columns (e.g. the Phase 9 lesson columns on ``conversations``),
the existing table must be altered explicitly or every query/insert that
references the new columns raises a PostgreSQL ``UndefinedColumn`` error,
which surfaces as an HTTP 500 (and, because the default error response lacks
CORS headers, as a browser-level ``TypeError: Failed to fetch`` on the
frontend).

These helpers run ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` statements
(PostgreSQL supports the ``IF NOT EXISTS`` clause) so the schema stays in sync
with the models without a full migration framework. Each statement is
idempotent and safe to run on every startup — if the column already exists the
statement is a no-op.
"""

import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# Phase 9 — lesson columns added to the ``conversations`` table.
# Each tuple: (column_name, column_type_sql). All nullable so pre-Phase-9
# rows (and free-form sessions without a lesson) keep working unchanged.
LESSON_COLUMNS = [
    ("lesson_id", "VARCHAR(80)"),
    ("lesson_title", "VARCHAR(200)"),
    ("lesson_objectives", "TEXT"),
]


def ensure_lesson_columns(engine: Engine) -> None:
    """Add the Phase 9 lesson columns to the ``conversations`` table if missing.

    Uses ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` so the operation is
    idempotent and safe to run on every startup. Existing rows are untouched
    (new columns default to NULL, matching the nullable model definition).
    """
    with engine.connect() as conn:
        for column_name, column_type in LESSON_COLUMNS:
            conn.execute(
                text(
                    f"ALTER TABLE conversations "
                    f"ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
                )
            )
        conn.commit()
    logger.info("Lesson columns verified on conversations table.")


# --------------------------------------------------------------------- #
# Phase 10 — Progress tracking & XP system.
#
# ``Base.metadata.create_all`` creates the ``user_progress`` and ``xp_awards``
# tables when they are missing, but it does NOT retroactively add the unique
# constraints if the tables were created by an older version of the code (or
# if a constraint was dropped). These statements ensure the one-to-one
# progress constraint and the idempotent-award constraint exist, using
# ``ADD CONSTRAINT IF NOT EXISTS`` (PostgreSQL supports it).
# --------------------------------------------------------------------- #

PROGRESS_CONSTRAINTS = [
    # One progress row per user.
    (
        "user_progress",
        "uq_user_progress_user_id",
        "UNIQUE (user_id)",
    ),
    # Idempotent XP awards: one row per (user, source, reference).
    (
        "xp_awards",
        "uq_xp_awards_user_source_reference",
        "UNIQUE (user_id, source, reference)",
    ),
]


def ensure_progress_schema(engine: Engine) -> None:
    """Ensure the Phase 10 progress/XP tables and constraints exist.

    ``create_all`` already creates the tables when missing; this helper
    guarantees the unique constraints exist on tables that pre-date Phase 10
    (or had a constraint dropped). It is idempotent and safe on every startup.

    The ``information_schema`` check avoids the ``ADD CONSTRAINT IF NOT
    EXISTS`` clause (which is only supported on PostgreSQL 9.5+ and is not
    available on some managed services), making this portable.
    """
    with engine.connect() as conn:
        for table_name, constraint_name, constraint_def in PROGRESS_CONSTRAINTS:
            exists = conn.execute(
                text(
                    "SELECT 1 FROM information_schema.table_constraints "
                    "WHERE table_name = :t AND constraint_name = :c "
                    "LIMIT 1"
                ),
                {"t": table_name, "c": constraint_name},
            ).first()
            if not exists:
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        f"ADD CONSTRAINT {constraint_name} {constraint_def}"
                    )
                )
        conn.commit()
    logger.info("Progress schema constraints verified.")


# --------------------------------------------------------------------- #
# Phase 11 — Quiz assessment columns added to the ``user_progress`` table.
#
# ``Base.metadata.create_all`` creates the ``quizzes``, ``quiz_questions``
# and ``quiz_attempts`` tables when missing, but it does NOT retroactively
# add the new quiz counter columns to an existing ``user_progress`` table.
# These statements add the three columns idempotently so the schema stays
# in sync with the model.
# --------------------------------------------------------------------- #

QUIZ_PROGRESS_COLUMNS = [
    ("completed_quizzes", "INTEGER NOT NULL DEFAULT 0"),
    ("average_quiz_score", "INTEGER NOT NULL DEFAULT 0"),
    ("latest_quiz_score", "INTEGER NOT NULL DEFAULT 0"),
]


def ensure_quiz_progress_columns(engine: Engine) -> None:
    """Add the Phase 11 quiz counter columns to ``user_progress`` if missing.

    Uses ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` so the operation is
    idempotent and safe to run on every startup. Existing rows keep their
    defaults (0) so pre-Phase-11 users see zeroed quiz stats.
    """
    with engine.connect() as conn:
        for column_name, column_type in QUIZ_PROGRESS_COLUMNS:
            conn.execute(
                text(
                    f"ALTER TABLE user_progress "
                    f"ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
                )
            )
        conn.commit()
    logger.info("Quiz progress columns verified on user_progress table.")


# --------------------------------------------------------------------- #
# Phase 11 Part 10 — Future compatibility: ``question_type`` column on
# the ``quiz_questions`` table.
#
# ``Base.metadata.create_all`` creates the ``quiz_questions`` table when
# missing (with the column), but it does NOT retroactively add the column
# to a table created by an older version of the code. This idempotent
# migration adds it so existing deployments pick up the new column without
# a manual ``ALTER TABLE``.
# --------------------------------------------------------------------- #

def ensure_quiz_question_type_column(engine: Engine) -> None:
    """Add the ``question_type`` column to ``quiz_questions`` if missing.

    Phase 11 Part 10 — future compatibility. The column defaults to
    ``'mcq'`` so all existing questions are treated as single-choice MCQ
    (the only type the built-in grader currently handles). Future question
    types (true/false, multiple-select, short-answer) can be seeded with
    their own ``question_type`` value and handled by an extended grader —
    no further migration needed.
    """
    with engine.connect() as conn:
        conn.execute(
            text(
                "ALTER TABLE quiz_questions "
                "ADD COLUMN IF NOT EXISTS question_type VARCHAR(24) "
                "NOT NULL DEFAULT 'mcq'"
            )
        )
        conn.commit()
    logger.info("question_type column verified on quiz_questions table.")


# --------------------------------------------------------------------- #
# Phase 11.5 — Daily progress tracking columns added to the ``user_progress`` table.
# --------------------------------------------------------------------- #

DAILY_PROGRESS_COLUMNS = [
    ("daily_practice_minutes", "INTEGER NOT NULL DEFAULT 0"),
    ("daily_conversations", "INTEGER NOT NULL DEFAULT 0"),
    ("daily_lessons", "INTEGER NOT NULL DEFAULT 0"),
    ("daily_quizzes", "INTEGER NOT NULL DEFAULT 0"),
]


def ensure_daily_progress_columns(engine: Engine) -> None:
    """Add the Phase 11.5 daily progress tracking columns to ``user_progress`` if missing.

    Uses ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` so the operation is
    idempotent and safe to run on every startup. Existing rows keep their
    defaults (0).
    """
    with engine.connect() as conn:
        for column_name, column_type in DAILY_PROGRESS_COLUMNS:
            conn.execute(
                text(
                    f"ALTER TABLE user_progress "
                    f"ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
                )
            )
        conn.commit()
    logger.info("Daily progress columns verified on user_progress table.")


# --------------------------------------------------------------------- #
# Forgot Password (Email OTP) — reset columns added to the ``users`` table.
# --------------------------------------------------------------------- #

PASSWORD_RESET_COLUMNS = [
    ("reset_otp_hash", "VARCHAR(255)"),
    ("reset_otp_expires_at", "TIMESTAMP WITH TIME ZONE"),
    ("reset_otp_attempts", "INTEGER NOT NULL DEFAULT 0"),
    ("reset_otp_last_sent_at", "TIMESTAMP WITH TIME ZONE"),
]


def ensure_password_reset_columns(engine: Engine) -> None:
    """Add the Forgot Password OTP columns to ``users`` if missing.

    Uses ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` so the operation is
    idempotent and safe to run on every startup. Existing rows get NULL
    OTP state (no reset in progress), matching a fresh account.
    """
    with engine.connect() as conn:
        for column_name, column_type in PASSWORD_RESET_COLUMNS:
            conn.execute(
                text(
                    f"ALTER TABLE users "
                    f"ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
                )
            )
        conn.commit()
    logger.info("Password reset OTP columns verified on users table.")


# --------------------------------------------------------------------- #
# Email Verification — columns added to the ``users`` table.
# --------------------------------------------------------------------- #

EMAIL_VERIFICATION_COLUMNS = [
    ("email_verification_otp_hash", "VARCHAR(255)"),
    ("email_verification_expires_at", "TIMESTAMP WITH TIME ZONE"),
    ("email_verification_attempts", "INTEGER NOT NULL DEFAULT 0"),
    ("email_verification_last_sent_at", "TIMESTAMP WITH TIME ZONE"),
]


def ensure_email_verification_columns(engine: Engine) -> None:
    """Add the Email Verification OTP columns to ``users`` if missing.

    Uses ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` so the operation is
    idempotent and safe to run on every startup — mirrors
    ``ensure_password_reset_columns``. Existing rows get NULL OTP state (no
    verification in progress).
    """
    with engine.connect() as conn:
        for column_name, column_type in EMAIL_VERIFICATION_COLUMNS:
            conn.execute(
                text(
                    f"ALTER TABLE users "
                    f"ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
                )
            )
        conn.commit()
    logger.info("Email verification OTP columns verified on users table.")


def ensure_is_email_verified_column(engine: Engine) -> None:
    """Add ``is_email_verified`` to ``users`` if missing.

    Handled separately from ``ensure_email_verification_columns`` because
    existing accounts need a *different* default than new ones: this
    ``ALTER TABLE`` uses ``DEFAULT TRUE`` so every pre-existing row (which
    already completed the pre-verification signup flow and has been logging
    in successfully) is backfilled as verified in one statement — this
    feature must never lock out the existing user base the moment it ships.
    Genuinely new signups explicitly pass ``is_email_verified=False`` at
    creation time (see ``create_user``), which overrides this column default
    for every row created through the application from here on.
    """
    with engine.connect() as conn:
        conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT TRUE"
            )
        )
        conn.commit()
    logger.info("is_email_verified column verified on users table.")


# --------------------------------------------------------------------- #
# Google Authentication — ``auth_provider`` column on the ``users`` table.
# --------------------------------------------------------------------- #


def ensure_auth_provider_column(engine: Engine) -> None:
    """Add ``auth_provider`` to ``users`` if missing.

    Uses ``ALTER TABLE ... ADD COLUMN IF NOT EXISTS`` so the operation is
    idempotent and safe to run on every startup. Every pre-existing row
    authenticated via the password flow, so it is backfilled as ``'email'``
    — the same default new email signups get (see ``create_user``).
    """
    with engine.connect() as conn:
        conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'email'"
            )
        )
        conn.commit()
    logger.info("auth_provider column verified on users table.")


__all__ = [
    "ensure_lesson_columns",
    "ensure_progress_schema",
    "ensure_quiz_progress_columns",
    "ensure_quiz_question_type_column",
    "ensure_daily_progress_columns",
    "ensure_password_reset_columns",
    "ensure_email_verification_columns",
    "ensure_is_email_verified_column",
    "ensure_auth_provider_column",
]
