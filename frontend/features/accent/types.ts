// Shared accent types for the frontend.
//
// Phase M13 — Global English Accent & Voice Personalization.
//
// These types mirror the backend's AccentManager metadata (see
// `backend/app/services/accent_manager.py`) so the frontend and backend
// share a single vocabulary for English accents. The canonical accent
// codes match the `EnglishVariant` enum in
// `backend/app/schemas/user_preferences.py` and the `english_variant`
// column in `user_preferences`.

/**
 * The canonical accent code stored in `user_preferences.english_variant`.
 *
 * Matches the backend `EnglishVariant` enum values:
 *   - `us`        — American English
 *   - `uk`        — British English
 *   - `australian` — Australian English
 *   - `neutral`   — International / Neutral English
 *
 * Future accents (Canadian, Irish, New Zealand, Indian English, South
 * African) can be added on the backend without changing this type — the
 * string union is intentionally permissive (`AccentCode` is a `string`)
 * so unknown codes degrade gracefully instead of crashing the UI.
 */
export type AccentCode = string;

/**
 * Lightweight metadata for a single accent, returned by
 * `GET /api/accents`. Mirrors `AccentManager.all_metadata()` on the
 * backend — enough to render an accent picker without exposing internal
 * rule data (spelling/vocabulary/voice mappings).
 */
export type AccentMetadata = {
    code: AccentCode;
    label: string;
    locale: string;
    flag: string;
    description: string;
};

/**
 * Response shape of `GET /api/accents`.
 */
export type AccentsResponse = {
    accents: AccentMetadata[];
};

/**
 * Static fallback metadata used when the `/api/accents` endpoint is
 * unreachable (e.g. the backend is offline during onboarding) or before
 * the metadata has loaded. Kept in sync with the backend's `_ACCENTS`
 * definitions so the UI always has labels to show.
 *
 * Adding a new accent on the backend does NOT require editing this list
 * — once the endpoint responds, the live metadata supersedes it.
 */
export const FALLBACK_ACCENTS: AccentMetadata[] = [
    {
        code: "us",
        label: "American English",
        locale: "en-US",
        flag: "🇺🇸",
        description: "United States English — rhotic, with American spelling and vocabulary.",
    },
    {
        code: "uk",
        label: "British English",
        locale: "en-GB",
        flag: "🇬🇧",
        description: "United Kingdom English — non-rhotic, with British spelling and vocabulary.",
    },
    {
        code: "australian",
        label: "Australian English",
        locale: "en-AU",
        flag: "🇦🇺",
        description: "Australian English — non-rhotic, with British spelling and unique vocabulary.",
    },
    {
        code: "neutral",
        label: "International English",
        locale: "en",
        flag: "🌐",
        description: "Neutral International English — clear, globally understood, no strong regional identity.",
    },
];

/**
 * The default accent code used when the user has not selected one.
 * Mirrors `AccentManager._default_code` on the backend (`"us"`).
 */
export const DEFAULT_ACCENT: AccentCode = "us";
