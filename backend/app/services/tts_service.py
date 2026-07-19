"""Text-to-speech service layer — Microsoft Edge TTS.

All speech-synthesis logic lives here. The API routes never call the
``edge-tts`` library directly; they call :func:`synthesize_speech`, which:

1. Accepts the AI reply text (and the learner's accent — Phase M13).
2. Calls Microsoft Edge TTS (via the ``edge-tts`` library) to synthesize
   speech using a natural neural voice matched to the learner's accent.
3. Returns the generated MP3 audio bytes.

Phase M13 — Global English Accent & Voice Personalization (Phase 8)
-------------------------------------------------------------------
Voice selection is delegated to the
:class:`VoiceSelector <app.services.voice_selector.VoiceSelector>`, which is
the **only** place that maps an accent to an Edge TTS voice ID. The voice
IDs themselves live in :mod:`app.services.accent_manager`. Callers pass the
learner's accent (from ``user_preferences.english_variant``) and the
correct regional voice is chosen automatically — American, British,
Australian or Neutral.

The ``EDGE_TTS_VOICE`` environment variable still wins when set, so an
operator can pin a specific voice for testing or accessibility. When no
accent is supplied, the default accent's voice (American English Aria) is
used, preserving the pre-M13 behaviour.

Configuration is read from environment variables (``EDGE_TTS_RATE``,
``EDGE_TTS_VOLUME``, ``EDGE_TTS_PITCH``) so the prosody can be tuned
without code changes. The default voice is
``en-US-AriaNeural`` — a natural, conversational female voice well-suited
to an English tutor, similar to Loora's style.

**No API key is required**: Microsoft Edge TTS is a free, keyless service.
The service degrades gracefully: if the ``edge-tts`` library is not
installed, it raises a :class:`TTSServiceError` with ``status_code=503``
so the API layer can return a clear "voice not available" response and
the frontend falls back to displaying the text only — exactly like the AI
service degrades when ``GROQ_API_KEY`` is missing.

No audio is persisted: the bytes are streamed back to the browser and
discarded. History stores text only (Phase 11.5 Part 6), so future TTS
can regenerate speech from the stored transcript.

This mirrors the architecture of :mod:`app.services.ai_service` so the
two external integrations (Groq + Edge TTS) share the same conventions:
``*ServiceError`` with ``status_code`` and graceful degradation.

Architecture::

    API Routes  →  TTS Service  →  VoiceSelector  →  AccentManager
                                   ↓
                          Microsoft Edge TTS (edge-tts / aiohttp)
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
from typing import Optional

from app.services.accent_manager import AccentCode
from app.services.voice_selector import voice_selector

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Edge TTS availability (checked once at import time)
# ---------------------------------------------------------------------------

try:
    import edge_tts

    _EDGE_TTS_AVAILABLE: bool = True
except ImportError:  # pragma: no cover
    _EDGE_TTS_AVAILABLE = False

# ---------------------------------------------------------------------------
# Configuration (read once at import; matches the ai_service convention)
# ---------------------------------------------------------------------------

# Default voice — kept for backward compatibility and as the ultimate
# fallback. In normal operation the voice is chosen per-accent by the
# :class:`VoiceSelector` (Phase M13). The ``EDGE_TTS_VOICE`` env var, when
# set, always overrides the accent-based selection so an operator can pin a
# specific voice for testing or accessibility.
EDGE_TTS_VOICE: str = os.getenv("EDGE_TTS_VOICE", "en-US-AriaNeural")

# Speech rate adjustment (e.g. "+10%" faster, "-10%" slower). "+0%" = normal.
EDGE_TTS_RATE: str = os.getenv("EDGE_TTS_RATE", "+0%")

# Volume adjustment (e.g. "+20%" louder, "-20%" quieter). "+0%" = normal.
EDGE_TTS_VOLUME: str = os.getenv("EDGE_TTS_VOLUME", "+0%")

# Pitch adjustment (e.g. "+2Hz" higher). "+0Hz" = normal.
EDGE_TTS_PITCH: str = os.getenv("EDGE_TTS_PITCH", "+0Hz")

# Hard cap on input text length to keep latency bounded and avoid abuse.
MAX_INPUT_CHARS: int = 5000


class TTSServiceError(Exception):
    """Raised when the TTS layer cannot synthesize speech.

    The ``status_code`` lets the API route map the failure to an appropriate
    HTTP error without leaking Edge TTS internals to the client.
    """

    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def is_tts_configured() -> bool:
    """Public helper used by the API layer to report TTS availability.

    Microsoft Edge TTS is a free, keyless service — it is "configured"
    whenever the ``edge-tts`` library is importable. No API key is needed.
    """
    return _EDGE_TTS_AVAILABLE


async def synthesize_speech(text: str, accent: Optional[AccentCode] = None) -> bytes:
    """Synthesize ``text`` into spoken audio via Microsoft Edge TTS.

    Parameters
    ----------
    text:
        The text to speak (typically Emma's AI reply).
    accent:
        The learner's chosen English variety (Phase M13), sourced from
        ``user_preferences.english_variant``. The
        :class:`VoiceSelector` maps it to the matching regional Edge TTS
        voice (American, British, Australian or Neutral). When ``None`` or
        unknown, the default accent's voice is used, preserving the
        pre-M13 behaviour. The ``EDGE_TTS_VOICE`` env var, when set,
        always overrides this selection.

    Returns
    -------
    bytes
        The generated MP3 audio bytes.

    Raises
    ------
    TTSServiceError
        With a ``status_code`` suitable for direct HTTP mapping on any
        failure (library missing, timeout, network, empty input).
    """
    cleaned = (text or "").strip()
    if not cleaned:
        raise TTSServiceError(
            "Nothing to say — the response was empty.",
            status_code=422,
        )
    if len(cleaned) > MAX_INPUT_CHARS:
        # Truncate rather than reject so a long reply still gets spoken.
        cleaned = cleaned[:MAX_INPUT_CHARS]

    if not _EDGE_TTS_AVAILABLE:
        # Graceful degradation: library not installed. The frontend uses
        # this 503 to fall back to text-only display without breaking the
        # session.
        raise TTSServiceError(
            "Voice playback is not configured. Install the 'edge-tts' package.",
            status_code=503,
        )

    # Phase M13 — choose the voice for the learner's accent. The
    # VoiceSelector is the only place that maps accents to voice IDs; the
    # EDGE_TTS_VOICE env var still wins when set (operator override).
    voice = voice_selector.select_voice(accent)

    communicate = edge_tts.Communicate(
        cleaned,
        voice=voice,
        rate=EDGE_TTS_RATE,
        volume=EDGE_TTS_VOLUME,
        pitch=EDGE_TTS_PITCH,
    )

    audio_buffer = io.BytesIO()
    try:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])
    except asyncio.TimeoutError as exc:
        logger.warning("Edge TTS timed out: %s", exc)
        raise TTSServiceError(
            "Voice synthesis timed out. The text is still shown above.",
            status_code=504,
        ) from exc
    except Exception as exc:
        # edge-tts / aiohttp can raise various connection errors. We log
        # the backend error (Part 7) and return a user-friendly message.
        logger.warning("Edge TTS error: %s", exc)
        raise TTSServiceError(
            "Could not reach the voice service. The text is still shown above.",
            status_code=502,
        ) from exc

    audio_bytes = audio_buffer.getvalue()
    if not audio_bytes:
        raise TTSServiceError(
            "The voice service returned empty audio. The text is still shown above.",
            status_code=502,
        )
    return audio_bytes


__all__ = [
    "TTSServiceError",
    "synthesize_speech",
    "is_tts_configured",
    "MAX_INPUT_CHARS",
]
