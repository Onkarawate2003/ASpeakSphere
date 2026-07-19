// API client for the conversation endpoints.
//
// Phase 6 — Frontend ↔ Backend Conversation Integration.
//
// All functions reuse the authenticated fetch helper from the auth module
// (`authedFetch`) so bearer-token injection, 401 handling and error parsing
// stay in one place. No authentication logic is duplicated here.
//
// IMPORTANT — route prefix:
//   `authedFetch` prepends `API_BASE_URL` which is `http://localhost:8000/api/v1`
//   (no trailing slash). The conversation router, however, is mounted under
//   `/api` (NOT `/api/v1`) in `backend/app/main.py`:
//       app.include_router(conversations.router, prefix="/api")
//   To reach `/api/conversations` from the `/api/v1` base we use the relative
//   path `/../conversations`. The LEADING SLASH is essential: it creates a
//   segment boundary so the URL parser resolves `..` against `v1`, producing
//   `http://localhost:8000/api/conversations`. Without the leading slash the
//   string concatenation yields `.../api/v1../conversations` (the `..` is glued
//   to `v1`), which 404s. This keeps a single source of truth for the base URL
//   (auth/api.ts) while still hitting the correct conversation routes.

import { authedFetch } from "@/features/auth/api";
import type {
    ConversationCreatePayload,
    ConversationDetailDTO,
    ConversationListItemDTO,
    ConversationResponseDTO,
    ConversationUpdatePayload,
    MessageCreatePayload,
    MessageResponseDTO,
    PracticeType,
} from "./types";

/**
 * Relative path that resolves from the `/api/v1` base URL to the
 * `/api/conversations` router. The leading slash is required so the `..`
 * segment is parsed correctly (see the header note). Using a relative segment
 * means we never hard-code a second base URL — the base stays the single
 * constant in `features/auth/api.ts`.
 */
const CONVERSATIONS_PATH = "/../conversations";

/**
 * Start a new conversation session.
 *
 * `POST /api/conversations` → 201 `ConversationResponseDTO`.
 * The backend creates an "active" conversation row in PostgreSQL.
 *
 * Phase 9 — an optional selected lesson can be persisted with the
 * conversation so Emma teaches that specific lesson. All lesson fields are
 * optional and omitted for free-form sessions (backward compatible).
 */
export async function startConversation(
    practiceType: PracticeType,
    lesson?: {
        id?: string | null;
        title?: string | null;
        objectives?: string[] | null;
    } | null,
): Promise<ConversationResponseDTO> {
    const payload: ConversationCreatePayload = {
        practice_type: practiceType,
        lesson_id: lesson?.id ?? null,
        lesson_title: lesson?.title ?? null,
        lesson_objectives: lesson?.objectives ?? null,
    };
    return authedFetch<ConversationResponseDTO>(CONVERSATIONS_PATH, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Fetch a single conversation with its messages.
 *
 * `GET /api/conversations/{id}` → 200 `ConversationDetailDTO`.
 */
export async function getConversation(
    id: number,
): Promise<ConversationDetailDTO> {
    return authedFetch<ConversationDetailDTO>(`${CONVERSATIONS_PATH}/${id}`, {
        method: "GET",
    });
}

/**
 * Fetch only the messages for a conversation.
 *
 * `GET /api/conversations/{id}/messages` → 200 `MessageResponseDTO[]`.
 */
export async function getConversationMessages(
    id: number,
): Promise<MessageResponseDTO[]> {
    return authedFetch<MessageResponseDTO[]>(
        `${CONVERSATIONS_PATH}/${id}/messages`,
        { method: "GET" },
    );
}

/**
 * Send a user message to a conversation.
 *
 * `POST /api/conversations/{id}/messages` → 201 `MessageResponseDTO`.
 *
 * NOTE: The backend stores BOTH the user message AND a placeholder AI reply,
 * but returns ONLY the user `MessageResponseDTO`. The AI placeholder is
 * surfaced separately by the context after the typing animation completes.
 */
export async function sendMessage(
    conversationId: number,
    message: string,
): Promise<MessageResponseDTO> {
    const payload: MessageCreatePayload = { message };
    return authedFetch<MessageResponseDTO>(
        `${CONVERSATIONS_PATH}/${conversationId}/messages`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
}

/**
 * Update a conversation (status, duration, ended_at).
 *
 * `PATCH /api/conversations/{id}` → 200 `ConversationResponseDTO`.
 * The backend auto-completes the conversation when `status` is set to
 * "ended" without an explicit `ended_at`/`duration_seconds`.
 */
export async function completeConversation(
    id: number,
    durationSeconds: number,
): Promise<ConversationResponseDTO> {
    const payload: ConversationUpdatePayload = {
        status: "ended",
        duration_seconds: durationSeconds,
    };
    return authedFetch<ConversationResponseDTO>(`${CONVERSATIONS_PATH}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

/**
 * Delete a conversation and its messages.
 *
 * `DELETE /api/conversations/{id}` → 204 (no content).
 */
export async function deleteConversation(id: number): Promise<void> {
    await authedFetch<void>(`${CONVERSATIONS_PATH}/${id}`, {
        method: "DELETE",
    });
}

/**
 * List the current user's conversations (newest first).
 *
 * `GET /api/conversations?skip=&limit=` → 200 `ConversationListItemDTO[]`.
 * The history UI is not built yet (Task 7 — API only).
 */
export async function getUserConversations(
    skip = 0,
    limit = 50,
): Promise<ConversationListItemDTO[]> {
    const query = `?skip=${skip}&limit=${limit}`;
    return authedFetch<ConversationListItemDTO[]>(
        `${CONVERSATIONS_PATH}${query}`,
        { method: "GET" },
    );
}
