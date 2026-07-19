"""Speech service layer — Groq Whisper speech-to-text (STT).

All audio transcription logic lives here. The API routes never call the
Groq SDK directly; they call :func:`transcribe_audio`, which:

1. Accepts the raw audio file object + filename from the uploaded blob
   (and the learner's accent — Phase M13).
2. Calls the Groq Whisper audio-transcription endpoint, using a
   *normalized* language hint derived from the accent.
3. Parses and returns the transcript text.

Phase M13 — Global English Accent & Voice Personalization (Phase 9)
-------------------------------------------------------------------
When the learner's accent is supplied, the STT language hint is sourced
from the :class:`VoiceSelector` (e.g. ``"en-GB"`` for British English).

**Important — Groq Whisper language parameter constraint.**
Groq Whisper only accepts base ISO-639-1 language codes (e.g. ``"en"``,
``"es"``, ``"fr"``). It does **NOT** accept BCP-47 locale tags such as
``"en-US"``, ``"en-GB"``, or ``"en-AU"`` — passing a locale raises
``unsupported language: en-GB`` and breaks transcription entirely.

The :class:`AccentManager` stores the full locale (``stt_language_hint``)
because other STT/TTS providers may support locale-specific codes in the
future, and the locale is also used for TTS voice selection. But before the
hint reaches Groq Whisper, :func:`_normalize_whisper_language` strips it
down to the base language code and validates it against a whitelist. This
means the user's accent influences the AI prompt, TTS voice, vocabulary,
grammar, and pronunciation feedback — but **never** breaks Whisper
transcription. All English accents (us, uk, australian, neutral, and any
future Canadian/Irish/Indian/etc. accents) map to ``"en"`` for Whisper.

When no accent is supplied, the generic ``"en"`` hint is used, preserving
the pre-M13 behaviour. An explicit ``language`` argument always takes
precedence over the accent-derived hint (and is also normalized).

Configuration is read from environment variables (``GROQ_API_KEY``,
``GROQ_WHISPER_MODEL``) so secrets never live in source code. The service
degrades gracefully: every failure mode (missing key, invalid key, rate
limit, timeout, network error, empty/unintelligible audio) is mapped to a
clear :class:`SpeechServiceError` that the API layer translates into an
HTTP error — without ever crashing FastAPI.

This mirrors the architecture of :mod:`app.services.ai_service` so the two
Groq integrations (chat + transcription) share the same conventions: lazy
singleton client, ``*ServiceError`` with ``status_code``, and graceful
degradation.

Architecture::

    API Routes  →  Speech Service  →  VoiceSelector  →  AccentManager
                      ↓ (normalize locale → base code)
                             Groq Whisper SDK
"""

from __future__ import annotations

import logging
import os
from typing import IO, Optional

from groq import Groq
from groq import (
    APIStatusError,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
)

from app.services.accent_manager import AccentCode
from app.services.voice_selector import voice_selector

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (read once at import; matches the ai_service convention)
# ---------------------------------------------------------------------------

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
# Groq's production-ready large-v3 Whisper model. Override via env if needed.
GROQ_WHISPER_MODEL: str = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")

# Per-request timeout in seconds. Whisper transcription is fast for short
# clips, but we cap the wait so a stalled request never hangs the UI.
GROQ_REQUEST_TIMEOUT_SECONDS: float = 60.0

# Groq's documented hard limit for audio uploads is 25 MB. We enforce it
# server-side so oversized recordings fail with a clear message instead of
# a generic upstream error.
MAX_AUDIO_BYTES: int = 25 * 1024 * 1024

# Audio MIME types Groq Whisper accepts. Used only for a friendly validation
# message — the model itself infers the codec from the filename extension.
SUPPORTED_AUDIO_EXTENSIONS: tuple[str, ...] = (
    ".webm",
    ".mp3",
    ".mp4",
    ".m4a",
    ".ogg",
    ".oga",
    ".wav",
    ".flac",
)

# ---------------------------------------------------------------------------
# Whisper language normalization (Phase M13 regression fix)
# ---------------------------------------------------------------------------
# Groq Whisper's ``language`` parameter accepts ONLY base ISO-639-1 codes
# (e.g. ``"en"``, ``"es"``, ``"fr"``). It rejects BCP-47 locale tags such as
# ``"en-US"``, ``"en-GB"``, ``"en-AU"`` with ``unsupported language: en-GB``,
# which breaks transcription entirely.
#
# The AccentManager stores the full locale in ``stt_language_hint`` (because
# other providers may support locale codes, and the locale is reused for TTS
# voice selection). Before any value reaches Groq Whisper we normalize it to
# the base language code and validate it against this whitelist. Unknown or
# unsupported values fall back to ``"en"`` so transcription never fails due
# to an accent preference.
#
# All current English accents (us, uk, australian, neutral) and any future
# English accents (Canadian, Irish, Indian, South African, etc.) map to
# ``"en"``. To support a non-English language in the future, add its base
# code here.
_WHISPER_SUPPORTED_LANGUAGES: frozenset[str] = frozenset(
    {
        "en", "es", "fr", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh",
        "ar", "hi", "tr", "pl", "sv", "uk", "id", "vi", "th", "el", "cs",
        "da", "fi", "he", "hu", "no", "ro", "sk", "ta", "ur",
    }
)

# The safe default language hint when normalization cannot produce a valid
# value. English is the application's working language.
_WHISPER_DEFAULT_LANGUAGE: str = "en"


def _normalize_whisper_language(language: Optional[str]) -> str:
    """Normalize a language hint to a value Groq Whisper accepts.

    Groq Whisper only accepts base ISO-639-1 codes (e.g. ``"en"``). It does
    NOT accept BCP-47 locale tags (``"en-US"``, ``"en-GB"``, ``"en-AU"``).
    Passing a locale raises ``unsupported language: en-GB`` and breaks
    transcription entirely.

    This function:

    * Strips any region/script suffix (``"en-GB"`` → ``"en"``,
      ``"en_US"`` → ``"en"``).
    * Lower-cases the result.
    * Validates it against :data:`_WHISPER_SUPPORTED_LANGUAGES`.
    * Falls back to :data:`_WHISPER_DEFAULT_LANGUAGE` (``"en"``) when the
      input is ``None``, empty, or unsupported.

    This guarantees that the user's accent preference — which legitimately
    influences the AI prompt, TTS voice, vocabulary, grammar, and
    pronunciation feedback — can NEVER break Whisper transcription. All
    English accents map to ``"en"``.

    Parameters
    ----------
    language:
        A language hint, which may be a base code (``"en"``) or a BCP-47
        locale (``"en-GB"``). ``None`` is treated as "use the default".

    Returns
    -------
    str
        A base ISO-639-1 code that Groq Whisper accepts (e.g. ``"en"``).
    """
    if not language:
        return _WHISPER_DEFAULT_LANGUAGE

    # Take the primary-language subtag before any region/script suffix.
    # Handles "en", "en-US", "en_GB", "en-US-x-foo", etc.
    base = language.strip().split("-")[0].split("_")[0].lower()

    if base in _WHISPER_SUPPORTED_LANGUAGES:
        return base

    # Unknown/unsupported language — fall back to English so transcription
    # never fails due to a language/accent preference.
    logger.warning(
        "Whisper language hint %r normalized to unsupported base %r; "
        "falling back to %r.",
        language,
        base,
        _WHISPER_DEFAULT_LANGUAGE,
    )
    return _WHISPER_DEFAULT_LANGUAGE


# Shared singleton — created on first use (see ``_get_client``).
_client: Optional[Groq] = None


class SpeechServiceError(Exception):
    """Raised when the speech layer cannot transcribe audio.

    The ``status_code`` lets the API route map the failure to an appropriate
    HTTP error without leaking Groq internals to the client.
    """

    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _get_client() -> Groq:
    """Return a shared :class:`Groq` client, creating it on first use.

    Instantiating the client does not make a network call, so it is safe to
    create even before a key is configured. The key is validated on the first
    real request.
    """
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise SpeechServiceError(
                "The speech service is not configured. Set GROQ_API_KEY in the backend environment.",
                status_code=503,
            )
        _client = Groq(api_key=GROQ_API_KEY, timeout=GROQ_REQUEST_TIMEOUT_SECONDS)
    return _client


def transcribe_audio(
    audio_file: IO[bytes],
    filename: str,
    language: Optional[str] = None,
    accent: Optional[AccentCode] = None,
) -> str:
    """Transcribe ``audio_file`` using Groq Whisper and return the text.

    Parameters
    ----------
    audio_file:
        An open binary file-like object positioned at byte 0. The caller is
        responsible for ensuring the read cursor is at the start; this
        function also seeks to 0 defensively.
    filename:
        The original filename **with extension** (e.g. ``recording.webm``).
        Whisper infers the audio codec from the extension, so it must match
        the actual container format of the bytes.
    language:
        Optional explicit language hint (e.g. ``"en"`` or ``"en-GB"``).
        When ``None`` (the default), the hint is derived from ``accent``
        via the :class:`VoiceSelector` (Phase M13). Passing an explicit
        value always takes precedence over the accent-derived hint.
        **Any value — explicit or accent-derived — is normalized to a base
        ISO-639-1 code** by :func:`_normalize_whisper_language` before it
        reaches Groq Whisper, which only accepts base codes (``"en"``), not
        BCP-47 locales (``"en-GB"``).
    accent:
        The learner's chosen English variety (Phase M13), sourced from
        ``user_preferences.english_variant``. When ``language`` is ``None``,
        the :class:`VoiceSelector` maps the accent to a locale hint
        (e.g. ``"en-GB"``). This locale is then normalized to ``"en"`` for
        Whisper (all English accents map to ``"en"``). The accent still
        influences the AI prompt, TTS voice, vocabulary, grammar, and
        pronunciation feedback — it just never breaks transcription. When
        both ``language`` and ``accent`` are ``None``, the generic ``"en"``
        hint is used, preserving the pre-M13 behaviour.

    Returns
    -------
    str
        The transcribed text, stripped of surrounding whitespace.

    Raises
    ------
    SpeechServiceError
        With a ``status_code`` suitable for direct HTTP mapping on any
        failure (missing key, rate limit, timeout, network, empty result).
    """
    client = _get_client()

    # Phase M13 — resolve the language hint. An explicit ``language`` always
    # wins; otherwise derive it from the accent; otherwise fall back to the
    # generic English hint.
    if language is None:
        language = voice_selector.select_stt_language(accent) or "en"

    # Phase M13 regression fix — Groq Whisper only accepts base ISO-639-1
    # codes (``"en"``), NOT BCP-47 locales (``"en-US"``, ``"en-GB"``,
    # ``"en-AU"``). Passing a locale raises ``unsupported language: en-GB``
    # and breaks transcription entirely. Normalize whatever we resolved
    # (explicit or accent-derived) to a base code validated against a
    # whitelist, falling back to ``"en"``. This guarantees the user's
    # accent preference can NEVER break Whisper transcription — all
    # English accents map to ``"en"``.
    language = _normalize_whisper_language(language)

    # Defensive: ensure the read cursor is at the start of the buffer.
    try:
        audio_file.seek(0)
    except (OSError, AttributeError):
        # Some file-like objects may not support seek; ignore and proceed.
        pass

    try:
        # ``response_format="text"`` makes the SDK return the transcript as a
        # plain ``str`` (no JSON envelope to unwrap).
        transcript: str = client.audio.transcriptions.create(
            model=GROQ_WHISPER_MODEL,
            file=(filename, audio_file),
            language=language,
            response_format="text",
        )  # type: ignore[assignment]
    except RateLimitError as exc:
        logger.warning("Groq Whisper rate limit reached: %s", exc)
        raise SpeechServiceError(
            "The speech service is busy right now. Please try again in a moment.",
            status_code=429,
        ) from exc
    except APITimeoutError as exc:
        logger.warning("Groq Whisper transcription timed out: %s", exc)
        raise SpeechServiceError(
            "Speech transcription timed out. Please try a shorter recording.",
            status_code=504,
        ) from exc
    except APIConnectionError as exc:
        logger.warning("Groq Whisper connection error: %s", exc)
        raise SpeechServiceError(
            "Could not reach the speech service. Please check your connection and try again.",
            status_code=502,
        ) from exc
    except APIStatusError as exc:
        # Map known HTTP status codes from Groq to friendly messages.
        status_code = exc.status_code
        if status_code == 401:
            message = "The speech service is not configured correctly."
            mapped = 503
        elif status_code == 413:
            message = "The recording is too large to transcribe. Please try a shorter clip."
            mapped = 413
        elif status_code == 422:
            message = "The audio format could not be processed. Please try recording again."
            mapped = 422
        else:
            message = "The speech service could not process the recording. Please try again."
            mapped = 502
        logger.warning(
            "Groq Whisper API error (status %s): %s", status_code, exc
        )
        raise SpeechServiceError(message, status_code=mapped) from exc
    except SpeechServiceError:
        raise
    except Exception as exc:
        logger.exception("Unexpected speech transcription failure: %s", exc)
        raise SpeechServiceError(
            "An unexpected error occurred during transcription. Please try again.",
            status_code=502,
        ) from exc

    text = (transcript or "").strip()
    if not text:
        # Whisper returned an empty string — the recording was silent or
        # the speech was unintelligible. Surface a clear, actionable error.
        raise SpeechServiceError(
            "No speech was detected in the recording. Please try speaking again.",
            status_code=422,
        )
    return text


__all__ = [
    "SpeechServiceError",
    "transcribe_audio",
    "MAX_AUDIO_BYTES",
    "SUPPORTED_AUDIO_EXTENSIONS",
]
