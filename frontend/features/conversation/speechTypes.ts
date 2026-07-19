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
};
