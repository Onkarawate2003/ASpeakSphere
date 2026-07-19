// API client for the Statistics Dashboard endpoints.
//
// Module M12 — Statistics Dashboard.
//
// Reuses the authenticated fetch helper from the auth module (`authedFetch`)
// so bearer-token injection, 401 handling and error parsing stay in one
// place. The stats router is mounted under `/api/v1/stats` (the default
// base URL), matching the progress/quizzes routers.

import { authedFetch } from "@/features/auth/api";
import type {
    CategoryDistributionItemDTO,
    DailyActivityPointDTO,
    StatsOverviewResponseDTO,
    StatsRangeKey,
} from "./types";

/** `GET /api/v1/stats/overview?range=...` → range totals + current-state fields. */
export function getStatsOverview(
    range: StatsRangeKey,
): Promise<StatsOverviewResponseDTO> {
    return authedFetch<StatsOverviewResponseDTO>(`/stats/overview?range=${range}`, {
        method: "GET",
    });
}

/** `GET /api/v1/stats/daily-activity?range=...` → per-day activity points, oldest first. */
export function getDailyActivity(
    range: StatsRangeKey,
): Promise<DailyActivityPointDTO[]> {
    return authedFetch<DailyActivityPointDTO[]>(`/stats/daily-activity?range=${range}`, {
        method: "GET",
    });
}

/** `GET /api/v1/stats/category-distribution?range=...` → session count + minutes per category. */
export function getCategoryDistribution(
    range: StatsRangeKey,
): Promise<CategoryDistributionItemDTO[]> {
    return authedFetch<CategoryDistributionItemDTO[]>(
        `/stats/category-distribution?range=${range}`,
        { method: "GET" },
    );
}
