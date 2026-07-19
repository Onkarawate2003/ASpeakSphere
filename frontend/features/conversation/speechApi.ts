// API client for the speech (STT + TTS) endpoints.
//
// Phase 11.5 — Real-Time Voice Conversation.
//
// These functions reuse the authenticated fetch helpers from the auth module
// (`authedFetch`, `authedFetchMultipart`, `authedFetchBinary`) so bearer-token
// injection, 401 handling and error parsing stay in one place. No
// authentication logic is duplicated here.
//
// Route prefix:
//   The speech router is mounted under `/api/v1` in `backend/app/main.py`,
//   so these paths resolve directly against the `API_BASE_URL`
//   (`http://localhost:8000/api/v1`) — no relative `..` segment needed
//   (unlike the conversation router which lives under `/api`).

import {
    authedFetch,
    authedFetchBinary,
    authedFetchMultipart,
} from "@/features/auth/api";
import type {
    SpeechStatusDTO,
    SynthesizePayload,
    TranscriptionResponseDTO,
} from "./speechTypes";

/** Base path for the speech router (mounted under `/api/v1`). */
const SPEECH_PATH = "/speech";

/**
 * Check whether STT and TTS are available.
 *
 * `GET /api/v1/speech/status` → 200 `SpeechStatusDTO`.
 *
 * The frontend calls this once on mount to decide whether to show playback
 * controls and attempt auto-play, without probing the endpoints first.
 */
export function getSpeechStatus(): Promise<SpeechStatusDTO> {
    return authedFetch<SpeechStatusDTO>(`${SPEECH_PATH}/status`, {
        method: "GET",
    });
}

/**
 * Transcribe an audio recording using Groq Whisper.
 *
 * `POST /api/v1/speech/transcribe` (multipart) → 200 `TranscriptionResponseDTO`.
 *
 * The returned transcript text is then inserted into the existing
 * conversation pipeline via the existing `sendMessage` flow — this function
 * performs NO conversation logic.
 *
 * @param audioBlob The recorded audio blob (e.g. from MediaRecorder).
 * @param filename  The filename **with extension** (e.g. `recording.webm`).
 *                  Whisper infers the codec from the extension.
 */
export async function transcribeAudio(
    audioBlob: Blob,
    filename: string,
): Promise<TranscriptionResponseDTO> {
    const formData = new FormData();
    formData.append("audio", audioBlob, filename);
    return authedFetchMultipart<TranscriptionResponseDTO>(
        `${SPEECH_PATH}/transcribe`,
        formData,
    );
}

/**
 * Synthesize text into spoken audio via ElevenLabs.
 *
 * `POST /api/v1/speech/synthesize` → 200 `audio/mpeg` (binary).
 *
 * Returns the raw MP3 bytes. The caller creates an object URL and plays it.
 * If TTS is not configured, the backend returns 503 and this throws an
 * `ApiError` — the caller should fall back to text-only display.
 */
export function synthesizeSpeech(
    payload: SynthesizePayload,
): Promise<ArrayBuffer> {
    return authedFetchBinary(`${SPEECH_PATH}/synthesize`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
