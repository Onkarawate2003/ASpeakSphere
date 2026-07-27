"""Pydantic schemas for the speech (STT + TTS) endpoints.

These models drive request/response validation for the ``/api/v1/speech``
routes introduced in Phase 11.5 — Real-Time Voice Conversation.

The STT endpoint accepts a multipart audio upload and returns the
transcript text. The TTS endpoint accepts a text body and returns raw MP3
audio bytes (no Pydantic model — a binary ``Response``).
"""

from pydantic import BaseModel, Field, field_validator

#: Speech playback speeds the frontend's speed-cycle button supports, and the
#: only values ``SynthesizeRequest.speed`` accepts. Single source of truth —
#: :mod:`app.services.tts_service` imports this rather than redefining it.
SUPPORTED_SPEECH_SPEEDS: tuple[float, ...] = (0.75, 1.0, 1.25, 1.5)


class TranscriptionResponse(BaseModel):
    """Response for ``POST /api/v1/speech/transcribe``.

    Contains only the transcribed text. The frontend inserts this text into
    the existing conversation pipeline exactly as if the learner typed it.
    """

    text: str = Field(..., description="The transcribed speech text.")


class SynthesizeRequest(BaseModel):
    """Payload for ``POST /api/v1/speech/synthesize``.

    The text to speak is supplied by the client, along with an optional
    playback ``speed`` multiplier (Speech Speed Control). The voice/model
    are still configured server-side via environment variables.
    """

    text: str = Field(..., min_length=1, max_length=5000, description="The text to synthesize.")
    speed: float = Field(
        default=1.0,
        description=(
            "Playback speed multiplier. Supported values: 0.75 (slow), "
            "1.0 (normal, default), 1.25 (fast), 1.5 (very fast). Omitting "
            "this field preserves the original, pre-speed-control behaviour."
        ),
    )

    @field_validator("speed")
    @classmethod
    def _validate_speed(cls, value: float) -> float:
        if value not in SUPPORTED_SPEECH_SPEEDS:
            raise ValueError(
                f"Unsupported speed {value!r}. Supported values: "
                f"{SUPPORTED_SPEECH_SPEEDS}."
            )
        return value


class SpeechStatusResponse(BaseModel):
    """Response for ``GET /api/v1/speech/status``.

    Lets the frontend know whether TTS is available so it can show/hide
    playback controls and auto-play without probing the endpoint first.
    STT (Groq Whisper) reuses the existing ``GROQ_API_KEY`` so it is always
    available when the AI conversation works.
    """

    stt_enabled: bool = Field(..., description="Whether speech-to-text is available.")
    tts_enabled: bool = Field(..., description="Whether text-to-speech is available.")


__all__ = [
    "SUPPORTED_SPEECH_SPEEDS",
    "TranscriptionResponse",
    "SynthesizeRequest",
    "SpeechStatusResponse",
]
