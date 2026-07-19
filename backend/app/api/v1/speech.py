"""Speech endpoints — STT (Groq Whisper) and TTS (Microsoft Edge TTS).

Phase 11.5 — Real-Time Voice Conversation.
Phase M13 — Global English Accent & Voice Personalization.

These routes are the *only* speech-related surface area. They are thin
wrappers around the service layer:

* ``POST /api/v1/speech/transcribe`` — accepts a multipart audio upload,
  returns the transcript text. The frontend then inserts the transcript
  into the existing conversation pipeline via the existing
  ``POST /api/conversations/{id}/messages`` endpoint — no conversation
  logic is duplicated here. The learner's accent (from
  ``user_preferences.english_variant``) is passed to the STT service as a
  language hint (Phase M13).
* ``POST /api/v1/speech/synthesize`` — accepts a text body, returns raw
  MP3 audio bytes. The frontend auto-plays the newest AI reply. The
  learner's accent selects the matching regional Edge TTS voice (Phase M13).
* ``GET /api/v1/speech/status`` — reports whether STT/TTS are configured so
  the frontend can adapt its UI (show/hide playback controls) without
  probing the endpoints first.

All routes require authentication (``get_current_user``). They do NOT touch
the database — speech is stateless. History stores text only (Part 6), so
no audio blobs are persisted.
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.auth.dependencies import get_current_user
from app.models.users import User
from app.schemas.speech import (
    SpeechStatusResponse,
    SynthesizeRequest,
    TranscriptionResponse,
)
from app.services.speech_service import (
    MAX_AUDIO_BYTES,
    SUPPORTED_AUDIO_EXTENSIONS,
    SpeechServiceError,
    transcribe_audio,
)
from app.services.tts_service import (
    TTSServiceError,
    is_tts_configured,
    synthesize_speech,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/speech", tags=["speech"])


def _user_accent(current_user: User) -> Optional[str]:
    """Return the authenticated user's chosen English accent, or ``None``.

    Phase M13 — the accent lives in ``user_preferences.english_variant``.
    The backend never trusts the frontend for this preference: it reads it
    directly from the authenticated user's preferences row. When the user
    has no preferences row or no accent set, ``None`` is returned and the
    services fall back to the default accent (American English).
    """
    preferences = getattr(current_user, "preferences", None)
    if preferences is None:
        return None
    return getattr(preferences, "english_variant", None)


@router.get("/status", response_model=SpeechStatusResponse)
def get_speech_status(
    current_user: User = Depends(get_current_user),
) -> SpeechStatusResponse:
    """Report whether STT and TTS are available.

    STT (Groq Whisper) reuses the existing ``GROQ_API_KEY``, so it is
    available whenever the AI conversation works. TTS (Microsoft Edge TTS)
    is a free, keyless service — it is available whenever the ``edge-tts``
    library is installed. The frontend uses this to decide whether to show
    playback controls and attempt auto-play.
    """
    stt_enabled = bool(os.getenv("GROQ_API_KEY", ""))
    return SpeechStatusResponse(
        stt_enabled=stt_enabled,
        tts_enabled=is_tts_configured(),
    )


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
)
async def transcribe(
    audio: UploadFile = File(..., description="Audio recording to transcribe."),
    current_user: User = Depends(get_current_user),
) -> TranscriptionResponse:
    """Transcribe an uploaded audio recording using Groq Whisper.

    Accepts a multipart file upload (``audio`` field). Returns the
    transcript text. The frontend then sends this text to the existing
    conversation message endpoint — this route performs NO conversation
    logic and touches no database.
    """
    # Validate the filename extension so Whisper can infer the codec.
    filename = audio.filename or "recording.webm"
    _, ext = os.path.splitext(filename)
    ext_lower = ext.lower()
    if ext_lower and ext_lower not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported audio format '{ext_lower or 'unknown'}'. "
                f"Supported: {', '.join(SUPPORTED_AUDIO_EXTENSIONS)}."
            ),
        )

    # Read the uploaded bytes once. UploadFile is a SpooledTemporaryFile; we
    # read it fully so we can enforce the size limit before sending it to
    # Groq (avoids streaming an oversized file upstream).
    try:
        audio_bytes = await audio.read()
    except Exception as exc:
        logger.warning("Failed to read uploaded audio: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read the uploaded audio file.",
        ) from exc
    finally:
        await audio.close()

    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded audio file is empty.",
        )

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"The recording is too large ({len(audio_bytes)} bytes). "
                f"Maximum is {MAX_AUDIO_BYTES} bytes."
            ),
        )

    # Wrap the bytes in a file-like object the Groq SDK accepts.
    import io

    file_obj = io.BytesIO(audio_bytes)

    try:
        text = transcribe_audio(file_obj, filename, accent=_user_accent(current_user))
    except SpeechServiceError as exc:
        logger.warning(
            "Speech transcription failed for user %s: %s (status %s)",
            current_user.id,
            exc.message,
            exc.status_code,
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from exc

    return TranscriptionResponse(text=text)


@router.post(
    "/synthesize",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"content": {"audio/mpeg": {}}, "description": "Synthesized MP3 audio."},
    },
)
async def synthesize(
    payload: SynthesizeRequest,
    current_user: User = Depends(get_current_user),
) -> Response:
    """Synthesize text into spoken audio via Microsoft Edge TTS.

    Returns raw MP3 bytes with ``Content-Type: audio/mpeg``. The frontend
    creates an object URL and auto-plays it for the newest AI reply.

    If TTS is not configured (``edge-tts`` not installed), returns 503 so
    the frontend can fall back to text-only display without breaking the
    session.
    """
    try:
        audio_bytes = await synthesize_speech(payload.text, accent=_user_accent(current_user))
    except TTSServiceError as exc:
        logger.warning(
            "TTS synthesis failed for user %s: %s (status %s)",
            current_user.id,
            exc.message,
            exc.status_code,
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from exc

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            # Hint to the browser that this is a one-shot audio response.
            "Content-Disposition": "inline; filename=emma-reply.mp3",
            # Allow the browser to cache identical replies briefly.
            "Cache-Control": "no-store",
        },
    )
