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
    is_final_turn: bool = False,
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
        is_final_turn: When ``True``, the caller has determined this is the
            learner's last message before the session auto-completes. Emma's
            system prompt gains wrap-up guidance so her reply doesn't end on
            an open question that the UI is about to cut off. Purely a
            prompt-content flag — it does not change the request made.

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
        is_final_turn=is_final_turn,
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


# ---------------------------------------------------------------------------
# Conversation summary generation (Phase 1 & Phase 2 — Practice-Aware AI Summary)
# ---------------------------------------------------------------------------

# Longer timeout for the batch evaluation call — it analyses the full history.
GROQ_SUMMARY_TIMEOUT_SECONDS: float = 90.0

_MODE_PROMPT_GUIDELINES = {
    "grammar": (
        "Focus your assessment specifically on GRAMMAR & SENTENCE STRUCTURE. "
        "Evaluate grammatical accuracy, verb tense consistency, clause structure, "
        "common grammar mistakes, and rules that need revision."
    ),
    "vocabulary": (
        "Focus your assessment specifically on VOCABULARY & WORD CHOICE. "
        "Evaluate vocabulary richness, word variety, contextual appropriateness, "
        "repetition of basic words, and opportunities for advanced vocabulary."
    ),
    "pronunciation": (
        "Focus your assessment specifically on PRONUNCIATION & SPEECH CLARITY. "
        "Evaluate phonetic clarity, word stress, intonation patterns, difficult "
        "words, and general speech articulation derived from the text input."
    ),
    "speaking": (
        "Focus your assessment specifically on SPEAKING FLUENCY & EXPRESSION. "
        "Evaluate speaking confidence, pace of expression, sentence formation, "
        "spontaneity, and overall communication effectiveness."
    ),
    "listening": (
        "Focus your assessment specifically on LISTENING COMPREHENSION. "
        "Evaluate how accurately the learner understood questions and prompts, "
        "whether key details were retained, and their ability to follow complex statements."
    ),
    "conversation": (
        "Focus your assessment specifically on CONVERSATIONAL FLOW & ENGAGEMENT. "
        "Evaluate turn-taking, relevance of responses, natural communication style, "
        "topic engagement, and active dialogue participation."
    ),
    "interview": (
        "Focus your assessment specifically on PROFESSIONAL INTERVIEW COMMUNICATION. "
        "Evaluate professional tone, structured answer format (e.g. STAR method), "
        "confidence, clarity, and conciseness of response."
    ),
}


def _build_summary_system_prompt(practice_type: Optional[str] = None, lesson_title: Optional[str] = None) -> str:
    mode_key = (practice_type or "").lower().strip()
    mode_guidelines = _MODE_PROMPT_GUIDELINES.get(
        mode_key,
        (
            "Provide a balanced overall assessment of the learner's English performance, "
            "focusing on communication clarity, vocabulary, grammar, and fluency."
        ),
    )

    lesson_context = f" The session focused on the lesson: '{lesson_title}'." if lesson_title else ""

    return f"""You are an expert English language coach. \
A learner just completed a practice session in '{mode_key or 'general'}' practice mode with an AI conversation partner.{lesson_context} \
Your job is to analyse the learner's messages and produce a concise, constructive, practice-mode-tailored evaluation.

Evaluation Focus:
{mode_guidelines}

Respond ONLY with a single valid JSON object — no prose, no markdown fences — \
with exactly these keys:
{{
  "overall_score": <integer 0-100>,
  "coach_feedback": "<2-3 sentence assessment tailored to the practice mode>",
  "strengths": ["<mode-specific strength 1>", "<mode-specific strength 2>", "<mode-specific strength 3>"],
  "areas_for_improvement": ["<mode-specific area 1>", "<mode-specific area 2>", "<mode-specific area 3>"],
  "next_recommendation": "<one concrete next-step suggestion tailored to this practice mode>"
}}

Rules:
- overall_score is 0-100 (100 = native-like mastery in this mode).
- coach_feedback must be warm, encouraging, specific, and directly reflect the '{mode_key or 'general'}' practice focus.
- Each list must have 2-4 items — short strings (under 120 characters).
- Do NOT include the AI assistant's messages in your evaluation — only assess the learner.
"""


def generate_conversation_summary(
    history: List[ConversationMessage],
    practice_type: Optional[str] = None,
    lesson_title: Optional[str] = None,
) -> dict:
    """Analyse the conversation transcript and return a structured evaluation.

    Phase 2 — Incorporates Practice Mode specific instructions into the Groq prompt.

    Args:
        history: The complete ordered message history for the conversation.
        practice_type: The practice mode string (e.g., 'speaking', 'grammar', 'vocabulary', etc.).
        lesson_title: Optional title of the selected lesson.

    Returns:
        A dict with keys: ``overall_score``, ``coach_feedback``,
        ``strengths``, ``areas_for_improvement``, ``next_recommendation``.

    Raises:
        AIServiceError: If Groq cannot produce a valid JSON evaluation.
    """
    import json  # local import — only needed for summary path

    # Compose the transcript of learner-only messages for evaluation.
    # NOTE: the ORM model uses `.sender` (not `.role`) and `.message` (not `.content`).
    learner_turns = [
        f"Turn {i + 1}: {msg.message}"
        for i, msg in enumerate(history)
        if msg.sender == "user"
    ]

    if not learner_turns:
        raise AIServiceError(
            "Cannot evaluate a conversation with no learner messages.",
            status_code=400,
        )

    transcript_text = "\n".join(learner_turns)
    system_prompt = _build_summary_system_prompt(practice_type=practice_type, lesson_title=lesson_title)
    user_prompt = (
        f"Here are the learner's messages from this {practice_type or 'general'} practice session:\n\n"
        f"{transcript_text}\n\n"
        f"Produce the JSON evaluation now."
    )

    try:
        # Use a fresh client with the longer summary timeout.
        if not GROQ_API_KEY:
            raise AIServiceError(
                "The AI service is not configured. Set GROQ_API_KEY.",
                status_code=503,
            )
        summary_client = Groq(api_key=GROQ_API_KEY, timeout=GROQ_SUMMARY_TIMEOUT_SECONDS)
        completion = summary_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=512,
            temperature=0.3,  # Low temperature for consistent, structured output
            response_format={"type": "json_object"},
        )
    except AIServiceError:
        raise
    except RateLimitError as exc:
        logger.warning("Groq rate limit exceeded during summary generation: %s", exc)
        raise AIServiceError("Rate limit exceeded during summary generation.", status_code=429) from exc
    except APITimeoutError as exc:
        logger.warning("Groq summary request timed out: %s", exc)
        raise AIServiceError("Summary generation timed out.", status_code=504) from exc
    except APIConnectionError as exc:
        logger.error("Could not connect to Groq for summary: %s", exc)
        raise AIServiceError("Could not reach AI service for summary.", status_code=503) from exc
    except APIStatusError as exc:
        status_code = getattr(exc, "status_code", None)
        logger.error("Groq API error during summary (status %s): %s", status_code, exc)
        raise AIServiceError("AI service error during summary generation.", status_code=502) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error during summary generation: %s", exc)
        raise AIServiceError("Unexpected error during summary generation.", status_code=500) from exc

    try:
        raw = completion.choices[0].message.content or ""
        result = json.loads(raw)
    except (AttributeError, IndexError, json.JSONDecodeError) as exc:
        logger.error("Could not parse Groq summary JSON: %r", getattr(completion, "choices", None))
        raise AIServiceError("AI returned an unparseable summary response.", status_code=502) from exc

    # Validate required keys are present; coerce to expected types.
    required_keys = {
        "overall_score", "coach_feedback", "strengths",
        "areas_for_improvement", "next_recommendation",
    }
    missing = required_keys - set(result.keys())
    if missing:
        logger.error("Groq summary JSON missing keys %s: %r", missing, result)
        raise AIServiceError(
            f"AI summary response is missing required fields: {missing}",
            status_code=502,
        )

    # Normalise types so callers get clean data.
    result["overall_score"] = max(0, min(100, int(result["overall_score"])))
    result["strengths"] = [str(s) for s in result.get("strengths", [])]
    result["areas_for_improvement"] = [str(s) for s in result.get("areas_for_improvement", [])]
    result["coach_feedback"] = str(result.get("coach_feedback", "")).strip()
    result["next_recommendation"] = str(result.get("next_recommendation", "")).strip()

    return result


__all__ = ["AIServiceError", "generate_ai_reply", "generate_conversation_summary"]

