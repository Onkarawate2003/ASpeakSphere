// API client for the accent metadata endpoint.
//
// Phase M13 — Global English Accent & Voice Personalization.
//
// `GET /api/accents` is a PUBLIC endpoint (no authentication required)
// mounted at `/api/accents` in `backend/app/main.py` — i.e. under `/api`
// but NOT under `/api/v1`. It returns metadata for every supported
// English accent from the backend's AccentManager (the single source of
// truth), so the frontend can render accent pickers without duplicating
// the accent list.
//
// Because the endpoint is public and lives outside `/api/v1`, we use a
// plain `fetch` against the same host (derived from the auth module's
// `API_BASE_URL`) rather than the authenticated `authedFetch` helper.

import { ApiError } from "@/features/auth/api";
import type { AccentsResponse, AccentMetadata } from "./types";

/**
 * Base URL for the public `/api/accents` endpoint.
 *
 * `API_BASE_URL` in the auth module is `http://localhost:8000/api/v1`.
 * The accents endpoint is mounted at `/api/accents`, so we strip the
 * `/api/v1` suffix to get `http://localhost:8000` and append `/api/accents`.
 * This keeps a single source of truth for the host (the auth module's
 * env var) while reaching the correct route.
 */
const API_HOST =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1")
        .replace(/\/api\/v1\/?$/, "")
        .replace(/\/$/, "");

const ACCENTS_URL = `${API_HOST}/api/accents`;

/**
 * Fetch metadata for every supported English accent.
 *
 * `GET /api/accents` → 200 `{ accents: AccentMetadata[] }`.
 *
 * Public — no bearer token required. On any error the caller should fall
 * back to `FALLBACK_ACCENTS` so the UI still renders.
 */
export async function fetchAccents(): Promise<AccentMetadata[]> {
    const response = await fetch(ACCENTS_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new ApiError(
            response.status,
            "Unable to load accent metadata.",
        );
    }

    const data = (await response.json()) as AccentsResponse;
    return data.accents;
}
