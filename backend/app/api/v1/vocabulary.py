"""API router for Vocabulary Coach endpoints.

Phase 1: Foundation.
Phase 1.5A: Save Word to Personal Vocabulary.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.saved_vocabulary import SavedWord
from app.models.users import User
from app.schemas.vocabulary import (
    PersonalizedDailyWordResponse,
    QuizGenerateResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    SavedWordCreate,
    SavedWordResponse,
    SavedWordStatusResponse,
    VocabProgressResponse,
    VocabularySearchRequest,
    VocabularySearchResponse,
)
from app.services.ai_service import AIServiceError
from app.services.vocab_service import search_word

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


# ---------------------------------------------------------------------------
# Phase 1: Vocabulary search
# ---------------------------------------------------------------------------

@router.post(
    "/search",
    response_model=VocabularySearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search vocabulary word details",
    description=(
        "Send an English word and receive AI-generated vocabulary details "
        "(Word, Pronunciation, Part of Speech, Meaning, Example Sentence)."
    ),
)
def lookup_vocabulary(
    payload: VocabularySearchRequest,
    current_user: User = Depends(get_current_user),
) -> VocabularySearchResponse:
    """Lookup vocabulary details for the given word."""
    try:
        return search_word(payload.word)
    except AIServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while searching for the word.",
        ) from exc


# ---------------------------------------------------------------------------
# Phase 1.5A: Save / unsave word endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/save",
    response_model=SavedWordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a word to the user's personal vocabulary",
    description=(
        "Save a vocabulary entry (word + pronunciation + meaning + example + "
        "synonyms + antonyms) to the authenticated user's personal collection. "
        "Silently returns the existing row if the word is already saved "
        "(duplicate-safe)."
    ),
)
def save_word(
    payload: SavedWordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavedWordResponse:
    """Save a vocabulary word for the authenticated user."""
    # Check whether the word is already saved — return it silently if so.
    existing = (
        db.query(SavedWord)
        .filter(
            SavedWord.user_id == current_user.id,
            SavedWord.word == payload.word.strip().lower(),
        )
        .first()
    )
    if existing:
        return existing  # type: ignore[return-value]

    new_entry = SavedWord(
        user_id=current_user.id,
        word=payload.word.strip().lower(),
        pronunciation=payload.pronunciation,
        part_of_speech=payload.part_of_speech,
        meaning=payload.meaning,
        example=payload.example,
        synonyms=payload.synonyms,
        antonyms=payload.antonyms,
    )
    db.add(new_entry)
    try:
        db.commit()
        db.refresh(new_entry)
    except IntegrityError:
        # Race condition: another request inserted simultaneously.
        db.rollback()
        existing = (
            db.query(SavedWord)
            .filter(
                SavedWord.user_id == current_user.id,
                SavedWord.word == payload.word.strip().lower(),
            )
            .first()
        )
        if existing:
            return existing  # type: ignore[return-value]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the word. Please try again.",
        )
    return new_entry  # type: ignore[return-value]


@router.delete(
    "/save/{word}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a saved word from the user's personal vocabulary",
    description=(
        "Delete the saved vocabulary entry for the given word from the "
        "authenticated user's collection. Returns 204 even if the word was "
        "not saved (idempotent)."
    ),
)
def unsave_word(
    word: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove a saved vocabulary word for the authenticated user."""
    entry = (
        db.query(SavedWord)
        .filter(
            SavedWord.user_id == current_user.id,
            SavedWord.word == word.strip().lower(),
        )
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()


@router.get(
    "/save/status/{word}",
    response_model=SavedWordStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check whether a word is saved by the current user",
    description=(
        "Returns `{ word, is_saved: bool }` for the given word and the "
        "authenticated user. Used by the frontend on page load to restore "
        "the star button state."
    ),
)
def get_save_status(
    word: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavedWordStatusResponse:
    """Return whether the authenticated user has saved the given word."""
    exists = (
        db.query(SavedWord.id)
        .filter(
            SavedWord.user_id == current_user.id,
            SavedWord.word == word.strip().lower(),
        )
        .first()
    )
    return SavedWordStatusResponse(word=word, is_saved=bool(exists))


@router.get(
    "/saved",
    response_model=List[SavedWordResponse],
    status_code=status.HTTP_200_OK,
    summary="List all words saved by the current user",
    description=(
        "Returns every vocabulary word saved by the authenticated user, "
        "newest first. Used by the 'My Vocabulary' page (web and Android) "
        "to render the saved-words list."
    ),
)
def list_saved_words(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[SavedWordResponse]:
    """Return all saved vocabulary words for the authenticated user, newest first."""
    return (
        db.query(SavedWord)
        .filter(SavedWord.user_id == current_user.id)
        .order_by(SavedWord.created_at.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# Phase 1.6 — Personalized Daily Word (Interest-Based)
# ---------------------------------------------------------------------------

@router.get(
    "/daily",
    response_model=PersonalizedDailyWordResponse,
    status_code=status.HTTP_200_OK,
    summary="Get today's personalized daily word recommendation",
    description=(
        "Returns a personalized daily word tailored to the authenticated user's "
        "learning goal, topics of interest, proficiency level, and focus area. "
        "Cached in DB per (user_id, date) so simple refreshes make 0 extra AI calls."
    ),
)
def get_daily_word(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PersonalizedDailyWordResponse:
    """Get or generate today's personalized daily word recommendation."""
    try:
        from app.services.vocab_service import get_or_generate_daily_word
        return get_or_generate_daily_word(db=db, user_id=current_user.id)  # type: ignore[return-value]
    except AIServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating today's daily word.",
        ) from exc


# ---------------------------------------------------------------------------
# Phase 1.7 — Vocabulary Quiz endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/quiz/generate",
    response_model=QuizGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a dynamic MCQ vocabulary quiz",
    description=(
        "Generates a dynamic 5-question MCQ quiz based on the user's saved words. "
        "Supplements with Personalized Daily Words or AI-generated words if saved words < 5."
    ),
)
def generate_quiz(
    count: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizGenerateResponse:
    """Generate dynamic vocabulary quiz questions."""
    try:
        from app.services.vocab_quiz_service import generate_vocab_quiz
        return generate_vocab_quiz(db=db, user_id=current_user.id, requested_count=count)
    except AIServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating the quiz.",
        ) from exc


@router.post(
    "/quiz/submit",
    response_model=QuizSubmissionResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit quiz answers, update word mastery, and award XP",
    description=(
        "Calculates quiz score, updates word-level mastery statuses in PostgreSQL, "
        "and awards XP via the shared XP ledger."
    ),
)
def submit_quiz(
    payload: QuizSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizSubmissionResponse:
    """Process quiz results, update mastery, and grant XP."""
    try:
        from app.services.vocab_quiz_service import submit_vocab_quiz
        return submit_vocab_quiz(db=db, user_id=current_user.id, payload=payload)
    except AIServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the quiz submission.",
        ) from exc


# ---------------------------------------------------------------------------
# Phase 1.8 — Vocabulary Progress & Mastery Dashboard endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/progress",
    response_model=VocabProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Get vocabulary progress, mastery breakdown, and strongest/weakest words",
    description=(
        "Returns total saved words, mastered/learning/needs_revision counts, "
        "overall accuracy percentage, and strongest vs. weakest words."
    ),
)
def get_progress_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VocabProgressResponse:
    """Get vocabulary progress and mastery dashboard metrics."""
    try:
        from app.services.vocab_quiz_service import get_vocab_progress
        return get_vocab_progress(db=db, user_id=current_user.id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving vocabulary progress.",
        ) from exc



