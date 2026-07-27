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
 * Speech Speed Control — the supported playback speed multipliers.
 *
 * The numeric `rate` values mirror `SUPPORTED_SPEECH_SPEEDS` in
 * `backend/app/schemas/speech.py` — the backend is the source of truth for
 * which values are valid; this list must stay in sync with it (same reasoning
 * as `MAX_USER_MESSAGES` mirroring a backend constant elsewhere in this
 * feature area).
 *
 * Each option exposes a stable string `value` (used as the persisted
 * identifier and the dropdown key), a human-readable `label`, and the numeric
 * `rate` actually sent to the backend in the synthesize payload.
 */
export interface SpeechSpeedOption {
    /** Stable identifier used for state + localStorage persistence. */
    value: SpeechSpeedValue;
    /** Human-readable label shown in the dropdown (e.g. "Normal"). */
    label: string;
    /** Numeric multiplier sent to the backend (e.g. 1.0). */
    rate: SpeechSpeed;
}

/** Stable string identifiers for each supported speed. */
export type SpeechSpeedValue = "slow" | "normal" | "fast" | "very_fast";

/**
 * Ordered list of selectable speed options, shown in the Speech Speed
 * dropdown. Default is "normal" (1x).
 */
export const SPEECH_SPEED_OPTIONS: readonly SpeechSpeedOption[] = [
    { value: "slow", label: "Slow", rate: 0.75 },
    { value: "normal", label: "Normal", rate: 1 },
    { value: "fast", label: "Fast", rate: 1.25 },
    { value: "very_fast", label: "Very Fast", rate: 1.5 },
] as const;

/** The numeric playback multipliers supported by the backend. */
export const SPEECH_SPEED_CYCLE = [1, 0.75, 1.25, 1.5] as const;

export type SpeechSpeed = (typeof SPEECH_SPEED_CYCLE)[number];

/** Display label for each supported speed, shown on the speed button. */
export const SPEECH_SPEED_LABELS: Record<SpeechSpeed, string> = {
    1: "Normal",
    0.75: "Slow",
    1.25: "Fast",
    1.5: "Very Fast",
};

/** Default speed option (Normal / 1x). */
export const DEFAULT_SPEECH_SPEED_VALUE: SpeechSpeedValue = "normal";

/**
 * Look up the numeric `rate` for a given speed `value`. Falls back to the
 * default (1x) if the value is unknown (e.g. a stale persisted value from an
 * older app version), so playback never breaks.
 */
export function speechSpeedRateForValue(
    value: SpeechSpeedValue,
): SpeechSpeed {
    const option = SPEECH_SPEED_OPTIONS.find((o) => o.value === value);
    return option ? option.rate : 1;
}

/**
 * Look up the option object for a given numeric `rate`. Falls back to the
 * default option if the rate is unknown.
 */
export function speechSpeedOptionForRate(
    rate: SpeechSpeed,
): SpeechSpeedOption {
    return (
        SPEECH_SPEED_OPTIONS.find((o) => o.rate === rate) ??
        SPEECH_SPEED_OPTIONS.find((o) => o.value === DEFAULT_SPEECH_SPEED_VALUE)!
    );
}
