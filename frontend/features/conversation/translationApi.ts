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
 * Supported translation target languages. Only Hindi is wired up today;
 * adding another language later is a matter of extending this union (and
 * the backend's `LANGUAGE_NAMES` map) — no other change is required.
 */
export type TranslationLanguage = "hi";

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
