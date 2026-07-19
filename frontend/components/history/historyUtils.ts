/**
 * Shared helpers for the Conversation History module (Phase 8).
 *
 * These utilities are local to the history feature so the live conversation
 * module stays untouched. They format the backend list/detail DTOs into the
 * human-readable labels shown on the history cards and detail page.
 */

import type {
    BackendConversationStatus,
    ConversationListItemDTO,
    PracticeType,
} from "@/features/conversation/types";
import { PRACTICE_LABELS } from "@/features/conversation/constants";
import { formatTimer } from "@/features/conversation/utils";

/** Filter options shown in the history filter bar. "all" = no filter. */
export type HistoryFilter = PracticeType | "all";

/** Sort options for the history list. */
export type HistorySort = "newest" | "oldest";

/** Ordered list of practice-type filters (excludes "all"). */
export const PRACTICE_FILTERS: PracticeType[] = [
    "speaking",
    "listening",
    "vocabulary",
    "grammar",
    "pronunciation",
];

/** Human-readable label for a practice type, reused from the conversation module. */
export function getPracticeLabel(practiceType: PracticeType): string {
    return PRACTICE_LABELS[practiceType] ?? "Practice";
}

/** Human-readable status badge label for a backend conversation status. */
export function getStatusLabel(status: BackendConversationStatus): string {
    return status === "ended" ? "Completed" : "In Progress";
}

/**
 * Format an ISO timestamp as a compact, locale-stable date string
 * (e.g. "Jul 13, 2026"). Falls back to "—" when the value is missing.
 */
export function formatHistoryDate(iso: string | null): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/**
 * Format a duration (seconds) as a short "Xm Ys" / "Ys" label for the
 * history card. Reuses the conversation module's `formatTimer` for the
 * underlying MM:SS, then trims the leading "00:" minutes when zero.
 */
export function formatDuration(seconds: number | null): string {
    if (seconds === null || seconds === undefined) return "—";
    return formatTimer(seconds);
}

/**
 * Sort the conversation list client-side.
 * - "newest" (default): most recent `started_at` first.
 * - "oldest": earliest `started_at` first.
 * Conversations with no `started_at` are pushed to the end.
 */
export function sortConversations(
    items: ConversationListItemDTO[],
    sort: HistorySort,
): ConversationListItemDTO[] {
    const sorted = [...items].sort((a, b) => {
        const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
        const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
        return sort === "newest" ? tb - ta : ta - tb;
    });
    return sorted;
}

/**
 * Filter the conversation list client-side by practice type.
 * "all" returns the list unchanged.
 */
export function filterConversations(
    items: ConversationListItemDTO[],
    filter: HistoryFilter,
): ConversationListItemDTO[] {
    if (filter === "all") return items;
    return items.filter((item) => item.practice_type === filter);
}
