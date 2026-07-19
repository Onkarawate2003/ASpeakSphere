// API client for the progress / XP endpoints.
//
// Phase 10 — Progress Tracking & XP System.
//
// All functions reuse the authenticated fetch helper from the auth module
// (`authedFetch`) so bearer-token injection, 401 handling and error parsing
// stay in one place. The progress router is mounted under `/api/v1/progress`
// (the default base URL), so no relative-path trickery is needed (unlike the
// conversation router which lives under `/api`).

import { authedFetch } from "@/features/auth/api";
import type {
    AwardXpPayload,
    AwardXpResponseDTO,
    ProgressResponseDTO,
} from "./types";

/**
 * Fetch the current user's progress record.
 *
 * `GET /api/v1/progress` → 200 `ProgressResponseDTO`.
 * The backend auto-creates a zeroed row on first read, so this always
 * returns a valid response for an authenticated user.
 */
export function getProgress(): Promise<ProgressResponseDTO> {
    return authedFetch<ProgressResponseDTO>("/progress", {
        method: "GET",
    });
}

/**
 * Refresh the progress record (returns the current state).
 *
 * `PUT /api/v1/progress` → 200 `ProgressResponseDTO`.
 * Kept for completeness / future admin tooling. The normal flow updates
 * progress automatically via conversation completion.
 */
export function refreshProgress(): Promise<ProgressResponseDTO> {
    return authedFetch<ProgressResponseDTO>("/progress", {
        method: "PUT",
    });
}

/**
 * Award XP from any module (Part 9 — future compatibility).
 *
 * `POST /api/v1/progress/award` → 200 `AwardXpResponseDTO`.
 * Idempotent: awarding the same `source`+`reference` a second time returns
 * `awarded: false` and grants no additional XP.
 *
 * Future modules (Quiz, Achievements, Daily Challenges, Vocabulary Games,
 * Speaking Assessment) award XP by calling this with their own `source`.
 */
export function awardXp(
    payload: AwardXpPayload,
): Promise<AwardXpResponseDTO> {
    return authedFetch<AwardXpResponseDTO>("/progress/award", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
