/**
 * Type definitions for the speech (STT + TTS) module.
 *
 * Phase 11.5 — Real-Time Voice Conversation.
 *
 * These mirror the Pydantic schemas in `backend/app/schemas/speech.py` so
 * the frontend can talk to the FastAPI speech endpoints. Field names and
 * casing match the JSON the backend serializes (snake_case).
 */

/** Response from `GET /api/v1/speech/status`. */
export type SpeechStatusDTO = {
    /** Whether speech-to-text (Groq Whisper) is available. */
    stt_enabled: boolean;
    /** Whether text-to-speech (ElevenLabs) is available. */
    tts_enabled: boolean;
};

/** Response from `POST /api/v1/speech/transcribe`. */
export type TranscriptionResponseDTO = {
    /** The transcribed speech text. */
    text: string;
};

/** Payload for `POST /api/v1/speech/synthesize`. */
export type SynthesizePayload = {
    /** The text to synthesize into speech. */
    text: string;
    /**
     * Playback speed multiplier (Speech Speed Control). Optional — omitting
     * it preserves the original pre-speed-control behaviour on the backend
     * (see `SUPPORTED_SPEECH_SPEEDS` in `backend/app/schemas/speech.py`).
     */
    speed?: SpeechSpeed;
};

/**
 * Speech Speed Control — the supported playback speed multipliers, in the
 * exact order the AIResponseCard's speed button cycles through them:
 * Normal → Slow → Fast → Very Fast → Normal → …
 *
 * Mirrors `SUPPORTED_SPEECH_SPEEDS` in `backend/app/schemas/speech.py` — the
 * backend is the source of truth for which values are valid; this list must
 * stay in sync with it (same reasoning as `MAX_USER_MESSAGES` mirroring a
 * backend constant elsewhere in this feature area).
 */
export const SPEECH_SPEED_CYCLE = [1, 0.75, 1.25, 1.5] as const;

export type SpeechSpeed = (typeof SPEECH_SPEED_CYCLE)[number];

/** Display label for each supported speed, shown on the speed button. */
export const SPEECH_SPEED_LABELS: Record<SpeechSpeed, string> = {
    1: "Normal",
    0.75: "Slow",
    1.25: "Fast",
    1.5: "Very Fast",
};
