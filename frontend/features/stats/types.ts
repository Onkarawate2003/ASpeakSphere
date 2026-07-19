/**
 * Type definitions for the Statistics Dashboard.
 *
 * Module M12 — Statistics Dashboard.
 *
 * These mirror the Pydantic schemas in `backend/app/schemas/stats.py` so the
 * frontend can talk to the FastAPI `/api/v1/stats/*` endpoints. Field names
 * and casing match the JSON the backend serializes (snake_case).
 */

/** Date-range filter, mapped 1:1 to the backend `StatsRange` enum. */
export type StatsRangeKey = "today" | "7d" | "30d" | "90d" | "year" | "all";

export const STATS_RANGE_OPTIONS: { value: StatsRangeKey; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "year", label: "This Year" },
    { value: "all", label: "All Time" },
];

/** A single day's activity snapshot — one point on a time-series chart. */
export type DailyActivityPointDTO = {
    date: string;
    practice_minutes: number;
    conversation_count: number;
    lesson_count: number;
    quiz_count: number;
    xp_earned: number;
};

/** Session count + total practice minutes for one practice category. */
export type CategoryDistributionItemDTO = {
    practice_type: string;
    session_count: number;
    total_minutes: number;
};

/** Response from `GET /api/v1/stats/overview`. */
export type StatsOverviewResponseDTO = {
    range: StatsRangeKey;
    xp_earned: number;
    practice_minutes: number;
    conversations_completed: number;
    lessons_completed: number;
    quizzes_completed: number;
    active_days: number;
    current_streak: number;
    current_level: number;
    average_quiz_score: number;
};
