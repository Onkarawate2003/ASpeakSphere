"""AI service layer — Groq-powered Emma tutor.

All Groq / LLM logic lives here. The API routes and CRUD layer never call the
Groq SDK directly; they call :func:`generate_ai_reply`, which:

1. Builds a practice-mode-specific system prompt for Emma (delegated to the
   :class:`PromptBuilder <app.services.prompt_builder.PromptBuilder>`, which
   considers the learner's accent, proficiency level, learning goal, topic
   and selected lesson).
2. Assembles the *complete* conversation history as chat messages so Emma
   remembers earlier turns naturally.
3. Calls the Groq chat-completions endpoint.
4. Parses and returns the AI response text.

Configuration is read from environment variables (``GROQ_API_KEY``,
``GROQ_MODEL``) so secrets never live in source code. The service degrades
gracefully: every failure mode (missing key, invalid key, rate limit,
timeout, network error, empty response) is mapped to a clear
:class:`AIServiceError` that the API layer translates into an HTTP error —
without ever crashing FastAPI or discarding the user's already-saved message.

Phase M13 — Global English Accent & Voice Personalization
---------------------------------------------------------
``generate_ai_reply`` now accepts the learner's ``accent`` (and optional
``proficiency_level``, ``learning_goal`` and ``topic``) so Emma always
speaks, spells and chooses vocabulary in the learner's chosen English
variety. The accent knowledge itself lives in
:mod:`app.services.accent_manager`; this module only forwards it to the
:class:`PromptBuilder`.

Architecture::

    API Routes  →  CRUD  →  AI Service  →  Database
                                 ↓
                          PromptBuilder  →  AccentManager
                                 ↓
                             Groq SDK
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional

from groq import Groq
from groq import APIStatusError, APIConnectionError, APITimeoutError, RateLimitError

from app.models.messages import ConversationMessage
from app.schemas.conversations import PracticeType
from app.services.accent_manager import AccentCode
from app.services.prompt_builder import prompt_builder

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (read once at import; matches the jwt_handler convention)
# ---------------------------------------------------------------------------

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Per-request timeout in seconds. Groq is fast, but we cap the wait so a
# stalled request never hangs the conversation indefinitely.
GROQ_REQUEST_TIMEOUT_SECONDS: float = 60.0


class AIServiceError(Exception):
    """Raised when the AI layer cannot produce a response.

    The ``status_code`` lets the API route map the failure to an appropriate
    HTTP error without leaking Groq internals to the client.
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
    """Return a shared :class:`Groq` client, creating it on first use.

    Instantiating the client does not make a network call, so it is safe to
    create even before a key is configured. The key is validated on the first
    real request.
    """
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise AIServiceError(
                "The AI service is not configured. Set GROQ_API_KEY in the backend environment.",
                status_code=503,
            )
        _client = Groq(api_key=GROQ_API_KEY, timeout=GROQ_REQUEST_TIMEOUT_SECONDS)
    return _client


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_ai_reply(
    practice_type: PracticeType,
    history: List[ConversationMessage],
    latest_user_message: str,
    *,
    accent: Optional[AccentCode] = None,
    proficiency_level: Optional[str] = None,
    learning_goal: Optional[str] = None,
    topic: Optional[str] = None,
    lesson_title: Optional[str] = None,
    lesson_objectives: Optional[List[str]] = None,
) -> str:
    """Generate Emma's reply for the latest user message.

    Args:
        practice_type: The practice mode of the owning conversation.
        history: The *complete* ordered message history (user + ai turns),
            including the just-saved latest user message as its final entry.
        latest_user_message: The text of the latest user message. Kept as an
            explicit argument for clarity / logging even though it is also
            the last entry of ``history``.
        accent: The learner's chosen English variety (Phase M13), sourced
            from ``user_preferences.english_variant``. When ``None`` or
            unknown, the default accent (American English) is used so Emma
            always speaks in a defined variety. The accent controls Emma's
            spelling, vocabulary, grammar and pronunciation guidance.
        proficiency_level: The learner's proficiency level (beginner →
            advanced). When provided, Emma calibrates her language
            complexity to the learner's level.
        learning_goal: The learner's reason for studying (career, travel,
            …). When provided, Emma tailors topics and scenarios to the goal.
        topic: An optional conversation topic/focus. When provided, Emma
            keeps the conversation oriented around this topic.
        lesson_title: Optional title of the selected lesson (Phase 9). When
            provided, Emma teaches that specific lesson instead of free-form
            practice. ``None`` keeps the original behaviour.
        lesson_objectives: Optional list of lesson objectives that Emma should
            guide the learner through. Ignored when ``lesson_title`` is empty.

    Returns:
        Emma's reply text.

    Raises:
        AIServiceError: If Groq cannot produce a response for any reason
            (missing/invalid key, rate limit, timeout, network failure, or
            empty response). The caller must NOT save an empty AI message —
            the user's message is already persisted and remains intact.
    """
    if not latest_user_message.strip():
        raise AIServiceError("Cannot generate a reply for an empty user message.", status_code=400)

    messages = prompt_builder.build_messages(
        practice_type,
        history,
        latest_user_message,
        accent=accent,
        proficiency_level=proficiency_level,
        learning_goal=learning_goal,
        topic=topic,
        lesson_title=lesson_title,
        lesson_objectives=lesson_objectives,
    )

    try:
        client = _get_client()
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            # Emma is conversational; keep replies focused and concise.
            max_tokens=512,
            temperature=0.7,
        )
    except AIServiceError:
        # Re-raise configuration errors (e.g. missing key) unchanged.
        raise
    except RateLimitError as exc:
        logger.warning("Groq rate limit exceeded: %s", exc)
        raise AIServiceError(
            "The AI service is busy right now. Please wait a moment and try again.",
            status_code=429,
        ) from exc
    except APITimeoutError as exc:
        logger.warning("Groq request timed out: %s", exc)
        raise AIServiceError(
            "The AI service took too long to respond. Please try again.",
            status_code=504,
        ) from exc
    except APIConnectionError as exc:
        logger.error("Could not connect to Groq: %s", exc)
        raise AIServiceError(
            "Could not reach the AI service. Please check your connection and try again.",
            status_code=503,
        ) from exc
    except APIStatusError as exc:
        # 401/403 → invalid key; 5xx → Groq server error; etc.
        status_code = getattr(exc, "status_code", None)
        if status_code in (401, 403):
            logger.error("Groq authentication failed (status %s)", status_code)
            raise AIServiceError(
                "The AI service rejected the configured API key. Please verify GROQ_API_KEY.",
                status_code=503,
            ) from exc
        logger.error("Groq API error (status %s): %s", status_code, exc)
        raise AIServiceError(
            "The AI service returned an error. Please try again shortly.",
            status_code=502,
        ) from exc
    except Exception as exc:  # noqa: BLE001 — last-resort guard so FastAPI never crashes
        logger.exception("Unexpected error while calling Groq: %s", exc)
        raise AIServiceError(
            "An unexpected error occurred while generating a response.",
            status_code=500,
        ) from exc

    # Parse the response — guard against an empty / malformed completion.
    try:
        content = completion.choices[0].message.content
    except (AttributeError, IndexError) as exc:
        logger.error("Malformed Groq response: %r", completion)
        raise AIServiceError(
            "The AI service returned an unexpected response. Please try again.",
            status_code=502,
        ) from exc

    if content is None:
        logger.error("Groq returned a None content for message: %r", latest_user_message)
        raise AIServiceError(
            "The AI service did not produce a response. Please try again.",
            status_code=502,
        )

    cleaned = content.strip()
    if not cleaned:
        logger.error("Groq returned an empty content for message: %r", latest_user_message)
        raise AIServiceError(
            "The AI service returned an empty response. Please try again.",
            status_code=502,
        )

    return cleaned


__all__ = ["AIServiceError", "generate_ai_reply"]
