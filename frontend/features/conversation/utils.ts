/**
 * Pure utility helpers for the AI Conversation module.
 */

import type { ConversationMessage, ConversationStatus } from "./types";

/**
 * Format a number of seconds as a `MM:SS` timer string.
 * @example formatTimer(0)   → "00:00"
 * @example formatTimer(65)  → "01:05"
 * @example formatTimer(3661)→ "61:01"
 */
export function formatTimer(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Format a timestamp as a short `HH:MM` clock string (24h, locale-stable).
 * Used as the timestamp placeholder on chat bubbles.
 */
export function formatTimestamp(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/**
 * Format an ISO timestamp as a compact, locale-stable date + time string
 * (e.g. "Jul 13, 2026, 14:05"). Phase 10.5 — used by the dynamic stats to
 * show the real session started/ended times. Returns "—" for missing or
 * invalid values so the UI never shows a blank.
 */
export function formatSessionDateTime(iso: string | null): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    const datePart = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${datePart}, ${hours}:${minutes}`;
}

/**
 * Generate a reasonably-unique id for a chat message.
 * Uses `crypto.randomUUID` when available, falling back to a timestamp+random.
 */
export function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Message-count → progress-percentage mapping (frontend-only state).
 *
 *   0 messages  →  0%
 *   1 message   →  8%
 *   3 messages  → 20%
 *   5 messages  → 35%
 *   8 messages  → 55%
 *   12 messages → 80%
 *   completed   → 100%
 *
 * Values between the anchors are interpolated linearly so the bar always
 * moves smoothly as the conversation grows. The result is clamped to
 * [0, 100].
 *
 * @param messageCount Total number of exchanged messages (AI + user).
 * @param completed     Whether the session has been marked complete.
 */
export function calculateProgress(
    messageCount: number,
    completed: boolean,
): number {
    if (completed) return 100;

    const safeCount = Math.max(0, Math.floor(messageCount));

    // Anchor points: [messageCount, percent]
    const ANCHORS: ReadonlyArray<readonly [number, number]> = [
        [0, 0],
        [1, 8],
        [3, 20],
        [5, 35],
        [8, 55],
        [12, 80],
    ];

    // Above the last anchor → cap at 80% until the session is completed.
    const last = ANCHORS[ANCHORS.length - 1];
    if (safeCount >= last[0]) return last[1];

    // Find the surrounding anchors and interpolate.
    for (let i = 0; i < ANCHORS.length - 1; i += 1) {
        const [lowCount, lowPct] = ANCHORS[i];
        const [highCount, highPct] = ANCHORS[i + 1];
        if (safeCount >= lowCount && safeCount < highCount) {
            if (highCount === lowCount) return highPct;
            const ratio = (safeCount - lowCount) / (highCount - lowCount);
            return Math.round(lowPct + ratio * (highPct - lowPct));
        }
    }

    return 0;
}

/** Human-readable session status labels shown in the sidebar / progress card. */
export type SessionStatusLabel =
    | "Ready"
    | "Conversation Started"
    | "Practicing"
    | "Almost Complete"
    | "Completed";

/**
 * Derive a human-readable session status label from the current lifecycle
 * state and progress percentage.
 *
 *   idle / 0%            → "Ready"
 *   active, < 20%        → "Conversation Started"
 *   active, 20%–79%      → "Practicing"
 *   active, 80%–99%      → "Almost Complete"
 *   ended / 100%         → "Completed"
 */
export function getSessionStatusLabel(
    status: ConversationStatus,
    percent: number,
): SessionStatusLabel {
    if (status === "ended" || percent >= 100) return "Completed";
    if (status === "idle" || percent <= 0) return "Ready";
    if (percent < 20) return "Conversation Started";
    if (percent < 80) return "Practicing";
    return "Almost Complete";
}

/**
 * Pick the next simulated AI response, avoiding consecutive repeats.
 *
 * Given the pool of available responses and the index of the last one
 * used, this returns a different response (and its new index) whenever
 * the pool has more than one option. When the pool has a single entry
 * that one is returned again. An empty pool yields an empty string.
 *
 * @param responses   The response pool for the current practice mode.
 * @param lastIndex   Index of the last response used (-1 if none yet).
 * @returns           The chosen response text and its index in the pool.
 */
export function pickNextResponse(
    responses: string[],
    lastIndex: number,
): { response: string; index: number } {
    if (responses.length === 0) {
        return { response: "", index: -1 };
    }
    if (responses.length === 1) {
        return { response: responses[0], index: 0 };
    }

    // Pick a random index that differs from the last one used.
    let next = lastIndex;
    let guard = 0;
    while (next === lastIndex && guard < 20) {
        next = Math.floor(Math.random() * responses.length);
        guard += 1;
    }
    // Fallback: if we somehow stayed on the same index, step forward.
    if (next === lastIndex) {
        next = (lastIndex + 1) % responses.length;
    }
    return { response: responses[next], index: next };
}

/* ============================================================
 * Phase 3 Part 2 — Participation score + export helpers
 * ============================================================ */

/** Human-readable participation tier derived from the numeric score. */
export type ParticipationTier = "Excellent" | "Good" | "Average";

/**
 * Calculate an automatic participation score (0–100) for a completed
 * session, using the total message count, completion state, and session
 * duration.
 *
 * The score blends three signals:
 *  - Engagement (message volume, up to ~50 pts at 20 messages).
 *  - Completion (100% → 40 pts, scaled linearly).
 *  - Duration (up to ~10 pts for sessions ≥ 3 minutes).
 *
 * The result is clamped to [0, 100].
 *
 * @param totalMessages  Total exchanged messages (AI + user).
 * @param completed      Whether the session was completed.
 * @param elapsedSeconds Session duration in seconds.
 */
export function calculateParticipationScore(
    totalMessages: number,
    completed: boolean,
    elapsedSeconds: number,
): number {
    const safeMessages = Math.max(0, Math.floor(totalMessages));
    const safeSeconds = Math.max(0, Math.floor(elapsedSeconds));

    // Engagement: 0 messages → 0, 20 messages → 50 (capped).
    const engagement = Math.min(50, (safeMessages / 20) * 50);

    // Completion: 100% → 40 pts.
    const completion = completed ? 40 : 0;

    // Duration: 0–180s maps to 0–10 pts (capped).
    const duration = Math.min(10, (safeSeconds / 180) * 10);

    const score = Math.round(engagement + completion + duration);
    return Math.max(0, Math.min(100, score));
}

/**
 * Map a numeric participation score to a human-readable tier.
 *
 *   ≥ 80 → "Excellent"
 *   ≥ 50 → "Good"
 *   else → "Average"
 */
export function getParticipationTier(score: number): ParticipationTier {
    if (score >= 80) return "Excellent";
    if (score >= 50) return "Good";
    return "Average";
}

/**
 * Count messages by role.
 */
export function countByRole(messages: ConversationMessage[]): {
    user: number;
    ai: number;
} {
    let user = 0;
    let ai = 0;
    for (const m of messages) {
        if (m.role === "user") user += 1;
        else ai += 1;
    }
    return { user, ai };
}

/**
 * Build a plain-text export of the conversation for download / clipboard.
 *
 * Format:
 *   SpeakSphere Conversation
 *
 *   Practice: <label>
 *   Duration: MM:SS
 *
 *   Conversation
 *
 *   Emma: <ai message>
 *   User: <user message>
 *   ...
 */
export function buildExportText(
    messages: ConversationMessage[],
    practiceLabel: string,
    elapsedSeconds: number,
): string {
    const lines: string[] = [];
    lines.push("SpeakSphere Conversation");
    lines.push("");
    lines.push(`Practice: ${practiceLabel}`);
    lines.push(`Duration: ${formatTimer(elapsedSeconds)}`);
    lines.push("");
    lines.push("Conversation");
    lines.push("");
    for (const m of messages) {
        const author = m.role === "ai" ? "Emma" : "User";
        lines.push(`${author}: ${m.content}`);
    }
    return lines.join("\n");
}
