"""Translation service layer — Groq-powered text translation.

AI Conversation Translation feature.

Reuses the existing Groq chat-completions infrastructure (the same
provider already used by :mod:`app.services.ai_service` for Emma's replies
and :mod:`app.services.speech_service` for Whisper STT) instead of
introducing a new third-party translation vendor (Google Translate, DeepL,
Azure Translator, LibreTranslate, etc.) — no new dependency, no new API
key to provision.

This module is intentionally isolated: it does not import from, and is
never imported by, ``ai_service.py`` or ``speech_service.py``. It keeps its
own lazy Groq client, mirroring the existing per-service-module convention
in this codebase, so this feature can never affect AI reply generation or
speech-to-text.

Only Hindi is wired up today, but the architecture is extensible: adding
another language is a matter of adding its code to ``LANGUAGE_NAMES``
below — no other change is required anywhere in this module or its route.

Translation is stateless and on-demand only: it is called ONLY when a
learner explicitly taps "Translate" on an already-rendered AI reply. It
never participates in the conversation-generation pipeline (STT → AI
reply → render → optional TTS), and nothing here is persisted — history
continues to store the original English text only.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from groq import Groq
from groq import (
    APIStatusError,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (read once at import; matches the ai_service/tts_service
# convention). Deliberately its own GROQ_API_KEY read + its own client
# instance below — not shared with ai_service.py/speech_service.py — so this
# feature cannot introduce any coupling to those modules.
# ---------------------------------------------------------------------------

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

# Allows pinning a different (e.g. smaller/cheaper) model for translation
# specifically; falls back to the same conversational model already used
# for Emma's replies, which is more than sufficient for short translations.
GROQ_TRANSLATION_MODEL: str = os.getenv("GROQ_TRANSLATION_MODEL") or os.getenv(
    "GROQ_MODEL", "llama-3.3-70b-versatile"
)

# Per-request timeout in seconds — translation inputs are short (a single
# AI reply), so this can be tighter than the conversational-reply timeout.
GROQ_REQUEST_TIMEOUT_SECONDS: float = 30.0

# Extensible language map: code -> display name used in the translation
# prompt. Add a new entry here to support another language later; nothing
# else in this module or its API route needs to change.
LANGUAGE_NAMES: dict[str, str] = {
    "hi": "Hindi",
}


class TranslationServiceError(Exception):
    """Raised when the translation layer cannot produce a result.

    The ``status_code`` lets the API route map the failure to an
    appropriate HTTP error without leaking Groq internals to the client.
    """

    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# ---------------------------------------------------------------------------
# Lazy Groq client (created on first use; no network call until a request)
# ---------------------------------------------------------------------------

_client: Optional[Groq] = None


def _get_client() -> Groq:
    """Return this module's own :class:`Groq` client, creating it on first use.

    Kept separate from ``ai_service``'s and ``speech_service``'s clients so
    a failure or change in this feature can never affect either of them.
    """
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise TranslationServiceError(
                "The translation service is not configured. Set GROQ_API_KEY in the backend environment.",
                status_code=503,
            )
        _client = Groq(api_key=GROQ_API_KEY, timeout=GROQ_REQUEST_TIMEOUT_SECONDS)
    return _client


def is_translation_configured() -> bool:
    """Whether translation is available (reuses the existing GROQ_API_KEY)."""
    return bool(GROQ_API_KEY)


def translate_text(text: str, target_language: str = "hi") -> str:
    """Translate ``text`` into ``target_language`` using the Groq LLM.

    Parameters
    ----------
    text:
        The English text to translate (typically a single AI reply).
    target_language:
        A key in :data:`LANGUAGE_NAMES`. Defaults to ``"hi"`` (Hindi).

    Returns
    -------
    str
        The translated text, stripped of surrounding whitespace.

    Raises
    ------
    TranslationServiceError
        On missing configuration, an unsupported language code, empty
        input, or any Groq failure (rate limit, timeout, network, invalid
        key, malformed/empty response) — mirrors the error-handling
        convention already used by ``ai_service.py``/``tts_service.py`` so
        the API layer can map it to a clean HTTP error without ever
        crashing FastAPI.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        raise TranslationServiceError(
            "Nothing to translate — the text was empty.", status_code=422
        )

    language_name = LANGUAGE_NAMES.get(target_language)
    if language_name is None:
        raise TranslationServiceError(
            f"Unsupported target language '{target_language}'.",
            status_code=422,
        )

    client = _get_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_TRANSLATION_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a precise translator. Translate the user's English "
                        f"text into {language_name}. Reply with ONLY the translated "
                        "text — no explanations, no quotation marks, no English, no "
                        "additional commentary."
                    ),
                },
                {"role": "user", "content": cleaned},
            ],
            max_tokens=1024,
            temperature=0.3,
        )
    except RateLimitError as exc:
        logger.warning("Groq rate limit reached during translation: %s", exc)
        raise TranslationServiceError(
            "The translation service is busy right now. Please try again in a moment.",
            status_code=429,
        ) from exc
    except APITimeoutError as exc:
        logger.warning("Groq translation request timed out: %s", exc)
        raise TranslationServiceError(
            "Translation timed out. Please try again.",
            status_code=504,
        ) from exc
    except APIConnectionError as exc:
        logger.error("Could not connect to Groq for translation: %s", exc)
        raise TranslationServiceError(
            "Could not reach the translation service. Please check your connection and try again.",
            status_code=503,
        ) from exc
    except APIStatusError as exc:
        status_code = getattr(exc, "status_code", None)
        if status_code in (401, 403):
            logger.error(
                "Groq authentication failed during translation (status %s)",
                status_code,
            )
            raise TranslationServiceError(
                "The translation service rejected the configured API key. Please verify GROQ_API_KEY.",
                status_code=503,
            ) from exc
        logger.error(
            "Groq API error during translation (status %s): %s", status_code, exc
        )
        raise TranslationServiceError(
            "The translation service returned an error. Please try again shortly.",
            status_code=502,
        ) from exc
    except TranslationServiceError:
        raise
    except Exception as exc:  # noqa: BLE001 — last-resort guard so FastAPI never crashes
        logger.exception("Unexpected error during translation: %s", exc)
        raise TranslationServiceError(
            "An unexpected error occurred while translating.",
            status_code=500,
        ) from exc

    try:
        translated = completion.choices[0].message.content
    except (AttributeError, IndexError) as exc:
        logger.error("Malformed Groq translation response: %r", completion)
        raise TranslationServiceError(
            "The translation service returned an unexpected response. Please try again.",
            status_code=502,
        ) from exc

    translated = (translated or "").strip()
    if not translated:
        raise TranslationServiceError(
            "The translation service returned an empty result.",
            status_code=502,
        )
    return translated


__all__ = [
    "TranslationServiceError",
    "translate_text",
    "is_translation_configured",
    "LANGUAGE_NAMES",
]
