"""Translation endpoint — on-demand text translation of an AI reply.

AI Conversation Translation feature. A small, fully isolated router: it
does not modify, and is never imported by, ``speech.py`` or
``conversations.py``. It reuses the existing Groq-based
:mod:`app.services.translation_service` instead of introducing a new
third-party translation vendor.

This endpoint is called ONLY when the learner explicitly taps the
Translate button on an already-rendered AI response in the frontend
(``AIResponseCard``) — it is never part of the conversation-generation
pipeline (STT → AI reply → render → optional TTS), which remains
completely unchanged. It touches no database table; conversation history
continues to store only the original English text.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.models.users import User
from app.schemas.translation import TranslateRequest, TranslateResponse
from app.services.translation_service import TranslationServiceError, translate_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/translate", tags=["translation"])


@router.post("", response_model=TranslateResponse, status_code=status.HTTP_200_OK)
async def translate(
    payload: TranslateRequest,
    current_user: User = Depends(get_current_user),
) -> TranslateResponse:
    """Translate a single piece of text (an existing AI reply) on demand.

    Stateless: does not touch the database or conversation history. The
    frontend caches the result client-side per message id, so repeated
    toggles never call this endpoint twice for the same message.
    """
    try:
        translated_text = translate_text(
            payload.text, target_language=payload.target_language
        )
    except TranslationServiceError as exc:
        logger.warning(
            "Translation failed for user %s: %s (status %s)",
            current_user.id,
            exc.message,
            exc.status_code,
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return TranslateResponse(
        translated_text=translated_text,
        target_language=payload.target_language,
    )
