/** Shared formatting/color helpers for the Statistics Dashboard charts. */

import type { StatsRangeKey } from "./types";

/**
 * Client-side date-range check against the same range semantics the
 * backend's `resolve_range` uses. Used to filter already-fetched data
 * (e.g. quiz history) by the shared `StatsContext.range` without a
 * duplicate backend endpoint.
 */
export function isWithinRange(dateIso: string, range: StatsRangeKey): boolean {
    if (range === "all") return true;
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    let start: Date;
    switch (range) {
        case "today":
            start = startOfToday;
            break;
        case "7d":
            start = new Date(startOfToday.getTime() - 6 * 86_400_000);
            break;
        case "30d":
            start = new Date(startOfToday.getTime() - 29 * 86_400_000);
            break;
        case "90d":
            start = new Date(startOfToday.getTime() - 89 * 86_400_000);
            break;
        case "year":
            start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
            break;
    }

    return date.getTime() >= start.getTime();
}

/** Format a "YYYY-MM-DD" date string as a short chart-axis label, e.g. "Jul 12". */
export function formatChartDate(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

/** Human-readable label for a backend `practice_type` value. */
export const PRACTICE_TYPE_LABELS: Record<string, string> = {
    speaking: "Speaking",
    listening: "Listening",
    vocabulary: "Vocabulary",
    grammar: "Grammar",
    pronunciation: "Pronunciation",
};

/** Accent colors matching the existing Tailwind palette used across the dashboard. */
export const PRACTICE_TYPE_COLORS: Record<string, string> = {
    speaking: "#2563eb", // blue-600
    listening: "#10b981", // emerald-500
    vocabulary: "#f43f5e", // rose-500
    grammar: "#8b5cf6", // violet-500
    pronunciation: "#f59e0b", // amber-500
};

export function practiceTypeLabel(practiceType: string): string {
    return PRACTICE_TYPE_LABELS[practiceType] ?? practiceType;
}

export function practiceTypeColor(practiceType: string): string {
    return PRACTICE_TYPE_COLORS[practiceType] ?? "#64748b"; // slate-500 fallback
}
