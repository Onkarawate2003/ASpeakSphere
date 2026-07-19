"""Voice selection layer — maps an accent to a Microsoft Edge TTS voice.

Phase M13 — Global English Accent & Voice Personalization (Phase 8).

This is the **only** place in the codebase that decides which Edge TTS
voice to use for a given accent. The TTS service delegates to
:class:`VoiceSelector` so voice IDs are never hardcoded outside the
:class:`AccentManager <app.services.accent_manager.AccentManager>`.

Design goals
------------
* **Single source of truth** — voice IDs live only in ``accent_manager``.
* **Graceful fallback** — if the primary voice is unavailable, fall back
  to an alternate voice for the same accent, then to the default accent's
  primary voice, then to the legacy ``EDGE_TTS_VOICE`` env override.
* **Env override preserved** — ``EDGE_TTS_VOICE`` still wins when set, so
  operators can pin a specific voice for testing or accessibility.
* **Backward compatible** — callers that pass ``None`` get the default
  accent's voice (American English Aria), matching the pre-M13 behavior.
"""

from __future__ import annotations

import os
from typing import Optional

from app.services.accent_manager import AccentCode, accent_manager


class VoiceSelector:
    """Resolves the Microsoft Edge TTS voice for a given accent.

    Stateless and safe to use as a module-level singleton
    (see :data:`voice_selector`).
    """

    def __init__(self) -> None:
        self._accent_manager = accent_manager

    def select_voice(self, accent: Optional[AccentCode]) -> str:
        """Return the best Edge TTS voice ID for ``accent``.

        Resolution order:

        1. ``EDGE_TTS_VOICE`` environment variable (operator override) —
           always wins when set, so a specific voice can be pinned.
        2. The accent's primary voice (from :class:`AccentManager`).
        3. The accent's first alternate voice.
        4. The default accent's primary voice.
        5. A hard fallback to the original pre-M13 default voice.
        """
        # 1. Operator override — highest priority.
        env_voice = os.getenv("EDGE_TTS_VOICE")
        if env_voice:
            return env_voice

        # 2. Accent's primary voice.
        config = self._accent_manager.get_config(accent)
        if config.primary_voice:
            return config.primary_voice

        # 3. Accent's first alternate voice.
        if config.alternate_voices:
            return config.alternate_voices[0]

        # 4. Default accent's primary voice.
        default_config = self._accent_manager.get_config(
            self._accent_manager.DEFAULT_ACCENT
        )
        if default_config.primary_voice:
            return default_config.primary_voice

        # 5. Hard fallback — the original pre-M13 default.
        return "en-US-AriaNeural"

    def select_stt_language(self, accent: Optional[AccentCode]) -> str:
        """Return the STT language hint for ``accent`` as a BCP-47 locale.

        Returns a locale such as ``"en-US"``, ``"en-GB"``, ``"en-AU"``, or
        ``"en"`` for neutral. Falls back to the default accent's locale when
        the accent is unknown.

        IMPORTANT: This returns a BCP-47 locale, but Groq Whisper only accepts
        base ISO-639-1 codes (``"en"``). The speech service normalizes the
        returned value via ``_normalize_whisper_language`` before it reaches
        Groq Whisper, so all English accents map to ``"en"`` for
        transcription. Callers must NOT pass this value directly to Groq
        Whisper.
        """
        return self._accent_manager.get_stt_language_hint(accent)


#: The application-wide :class:`VoiceSelector` instance.
voice_selector: VoiceSelector = VoiceSelector()


__all__ = ["VoiceSelector", "voice_selector"]
