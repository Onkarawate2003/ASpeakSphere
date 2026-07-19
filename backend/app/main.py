"""FastAPI application entry point.

Loads environment variables, creates database tables and registers all API
routers (auth + onboarding).
"""

import os

# Load .env FIRST, before any module that reads environment variables at import
# time (e.g. app.auth.jwt_handler reads SECRET_KEY/ALGORITHM on import).
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.api.v1 import (  # noqa: E402
    auth,
    conversations,
    onboarding,
    progress,
    quizzes,
    speech,
    stats,
)
from app.database import Base, engine  # noqa: E402
from app.migrations import (  # noqa: E402
    ensure_lesson_columns,
    ensure_progress_schema,
    ensure_quiz_progress_columns,
    ensure_quiz_question_type_column,
    ensure_daily_progress_columns,
    ensure_password_reset_columns,
    ensure_email_verification_columns,
    ensure_is_email_verified_column,
    ensure_auth_provider_column,
)

# Importing the models ensures their tables are registered on ``Base.metadata``
# before ``create_all`` runs.
from app.models import (  # noqa: E402
    Conversation,
    ConversationMessage,
    DailyActivity,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
    UserPreferences,
    UserProgress,
    XpAward,
)

Base.metadata.create_all(bind=engine)

# ``create_all`` only creates missing *tables* — it does NOT add columns to
# existing tables. Run the idempotent column migrations so the schema stays in
# sync with the models (e.g. the Phase 9 lesson columns). Safe on every start.
ensure_lesson_columns(engine)
# Phase 10 — ensure the progress / XP tables and their unique constraints
# exist (idempotent). Safe on every startup.
ensure_progress_schema(engine)
# Phase 11 — ensure the quiz counter columns exist on ``user_progress``
# (idempotent). Safe on every startup.
ensure_quiz_progress_columns(engine)
# Phase 11 Part 10 — ensure the ``question_type`` column exists on
# ``quiz_questions`` for future question-type extensibility (idempotent).
ensure_quiz_question_type_column(engine)
# Phase 11.5 — ensure the daily progress tracking columns exist (idempotent).
ensure_daily_progress_columns(engine)
# Forgot Password (Email OTP) — ensure the reset OTP columns exist on
# ``users`` (idempotent). Safe on every startup.
ensure_password_reset_columns(engine)
# Email Verification — ensure the ``is_email_verified`` flag and its OTP
# columns exist on ``users`` (idempotent). Safe on every startup. The flag
# column must run first so pre-existing rows are backfilled as verified
# before anything else touches the table.
ensure_is_email_verified_column(engine)
ensure_email_verification_columns(engine)
# Google Authentication — ensure the ``auth_provider`` column exists on
# ``users`` (idempotent). Safe on every startup.
ensure_auth_provider_column(engine)

# Phase 11 — seed the quiz content (idempotent upsert). Safe on every startup.
from app.database import SessionLocal  # noqa: E402
from app.seed.quizzes import seed_quizzes  # noqa: E402

_seed_db = SessionLocal()
try:
    seed_quizzes(_seed_db)
finally:
    _seed_db.close()

# Module M12 — recompute the daily_activity snapshot table from the source
# tables (Conversation, QuizAttempt, XpAward). Idempotent (overwrite, not
# increment) and cheap, so it is safe to run on every startup — this both
# keeps live data in sync and backfills history that predates this feature.
from app.crud.daily_activity import backfill_all  # noqa: E402

_backfill_db = SessionLocal()
try:
    backfill_all(_backfill_db)
finally:
    _backfill_db.close()

app = FastAPI(title="ASpeakSphere API")

# Allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
# Phase 10 — Progress tracking & XP system routes.
app.include_router(progress.router, prefix="/api/v1")
# Phase 11 — Lesson Assessment (Quiz) routes.
app.include_router(quizzes.router, prefix="/api/v1")
# Phase 11.5 — Real-Time Voice Conversation: STT (Groq Whisper) + TTS
# (ElevenLabs) routes. Stateless — no database access. Mounted under
# /api/v1 alongside the other authenticated feature routers.
app.include_router(speech.router, prefix="/api/v1")
# Conversation routes are mounted under /api (not /api/v1) per the Phase 5
# specification: POST /api/conversations, GET /api/conversations, etc.
app.include_router(conversations.router, prefix="/api")
# Module M12 — Statistics Dashboard: range-scoped XP/session/category analytics.
app.include_router(stats.router, prefix="/api/v1")

from fastapi import Depends
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.users import ProfileResponse, ProfileUpdate


@app.get("/api/profile", response_model=ProfileResponse)
def read_profile(current_user: User = Depends(get_current_user)) -> ProfileResponse:
    """Return the profile of the current authenticated user in camelCase.

    displayName is sourced from user_preferences.display_name so the greeting
    priority is: display_name (if set) → first_name.

    Phase M13 — englishAccent is sourced from
    user_preferences.english_variant so the frontend can display the active
    accent and keep its UI in sync without a separate request.
    """
    preferences = current_user.preferences
    display_name = preferences.display_name if preferences else None
    english_accent = preferences.english_variant if preferences else None
    return ProfileResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        displayName=display_name,
        englishAccent=english_accent,
    )


@app.put("/api/profile", response_model=ProfileResponse)
def update_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    """Update profile information for the current user."""
    current_user.first_name = profile_in.firstName.strip()
    current_user.last_name = profile_in.lastName.strip()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return ProfileResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
    )


@app.get("/api/accents")
def list_accents():
    """Return metadata for every supported English accent.

    Phase M13 — the frontend uses this to render the accent picker (in
    onboarding and settings) from the backend's single source of truth
    (the AccentManager), so adding a new accent requires no frontend
    changes. Public — no authentication required since accent metadata is
    not user-specific.
    """
    from app.services.accent_manager import accent_manager

    return {"accents": accent_manager.all_metadata()}


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ASpeakSphere API"}
