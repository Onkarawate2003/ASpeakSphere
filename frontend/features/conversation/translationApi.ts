// API client for the on-demand AI-reply translation endpoint.
//
// AI Conversation Translation feature.
//
// Mirrors the existing `speechApi.ts` pattern (thin wrapper over
// `authedFetch`, no logic duplicated). Kept in its own file — deliberately
// NOT added to `speechApi.ts`/`speechTypes.ts` — so this feature never
// required touching the existing STT/TTS API client at all.
//
// Route prefix:
//   The translation router is mounted under `/api/v1` in
//   `backend/app/main.py`, so this path resolves directly against
//   `API_BASE_URL` (`http://localhost:8000/api/v1`).

import { authedFetch } from "@/features/auth/api";

/** Base path for the translation endpoint (mounted under `/api/v1`). */
const TRANSLATE_PATH = "/translate";

/**
 * Supported translation target languages. Mirrors the backend's
 * `LANGUAGE_NAMES` map (`app/services/translation_service.py`) key for key.
 * Adding another language later is a matter of extending this union, adding
 * one entry to `TRANSLATION_LANGUAGES` below, and adding the matching entry
 * to the backend's `LANGUAGE_NAMES` — no other change is required.
 */
export type TranslationLanguage =
    | "hi"
    | "mr"
    | "es"
    | "fr"
    | "de"
    | "ja"
    | "ko"
    | "zh"
    | "ar"
    | "pt"
    | "it";

export type TranslationLanguageOption = {
    code: TranslationLanguage;
    /** Display name shown in the language selector. */
    label: string;
    /** Flag emoji shown next to the display name. */
    flag: string;
};

/**
 * Ordered list of selectable translation languages, used by
 * `AIResponseCard`'s language selector. Kept here (next to
 * `TranslationLanguage`/`translateText`) so the frontend's "supported
 * languages" list has exactly one source of truth.
 */
export const TRANSLATION_LANGUAGES: readonly TranslationLanguageOption[] = [
    { code: "hi", label: "Hindi", flag: "🇮🇳" },
    { code: "mr", label: "Marathi", flag: "🇮🇳" },
    { code: "es", label: "Spanish", flag: "🇪🇸" },
    { code: "fr", label: "French", flag: "🇫🇷" },
    { code: "de", label: "German", flag: "🇩🇪" },
    { code: "ja", label: "Japanese", flag: "🇯🇵" },
    { code: "ko", label: "Korean", flag: "🇰🇷" },
    { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳" },
    { code: "ar", label: "Arabic", flag: "🇸🇦" },
    { code: "pt", label: "Portuguese", flag: "🇵🇹" },
    { code: "it", label: "Italian", flag: "🇮🇹" },
];

export type TranslateRequestPayload = {
    /** The English text to translate (an existing AI reply). */
    text: string;
    /** Target language code. */
    target_language: TranslationLanguage;
};

export type TranslateResponseDTO = {
    translated_text: string;
    target_language: string;
};

/**
 * Translate a single piece of text (an AI reply) on demand.
 *
 * `POST /api/v1/translate` → 200 `TranslateResponseDTO`.
 *
 * Stateless and independent of the conversation pipeline — this is called
 * only when the learner explicitly taps Translate on an already-rendered
 * AI response. The caller (`AIResponseCard`) is responsible for caching
 * the result per message id so this is never called twice for the same
 * message.
 */
export function translateText(
    payload: TranslateRequestPayload,
): Promise<TranslateResponseDTO> {
    return authedFetch<TranslateResponseDTO>(TRANSLATE_PATH, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
