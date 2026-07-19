"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";

import { ApiError } from "@/features/auth/api";
import { getCategoryDistribution, getDailyActivity, getStatsOverview } from "./api";
import type {
    CategoryDistributionItemDTO,
    DailyActivityPointDTO,
    StatsOverviewResponseDTO,
    StatsRangeKey,
} from "./types";

type StatsContextValue = {
    /** The active date-range filter, shared by every chart on the page. */
    range: StatsRangeKey;
    setRange: (range: StatsRangeKey) => void;
    overview: StatsOverviewResponseDTO | null;
    dailyActivity: DailyActivityPointDTO[];
    categoryDistribution: CategoryDistributionItemDTO[];
    /** True while the initial fetch (for the current range) is in flight. */
    isLoading: boolean;
    /** Error message from the last fetch (null when clean). */
    error: string | null;
};

const StatsContext = createContext<StatsContextValue | null>(null);

/**
 * Stats provider — the single source of truth for the Statistics Dashboard.
 *
 * Module M12 — Statistics Dashboard.
 *
 * Fetches `overview`, `dailyActivity` and `categoryDistribution` in
 * parallel whenever `range` changes — **one** provider-level fetch per
 * filter change, not one per chart, so every chart/tile on the page reads
 * from the same in-flight request instead of triggering its own. Mirrors
 * `ProgressContext`'s overlapping-request guard and toast-on-refresh-failure
 * conventions.
 */
export function StatsProvider({ children }: { children: React.ReactNode }) {
    const [range, setRange] = useState<StatsRangeKey>("30d");
    const [overview, setOverview] = useState<StatsOverviewResponseDTO | null>(null);
    const [dailyActivity, setDailyActivity] = useState<DailyActivityPointDTO[]>([]);
    const [categoryDistribution, setCategoryDistribution] = useState<
        CategoryDistributionItemDTO[]
    >([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Guards against a stale, slower request (e.g. from a previous range)
    // overwriting the result of a newer one.
    const requestIdRef = useRef(0);

    const load = useCallback(async (activeRange: StatsRangeKey) => {
        const requestId = ++requestIdRef.current;
        setIsLoading(true);
        setError(null);
        try {
            const [overviewData, dailyData, categoryData] = await Promise.all([
                getStatsOverview(activeRange),
                getDailyActivity(activeRange),
                getCategoryDistribution(activeRange),
            ]);
            if (requestIdRef.current !== requestId) return;
            setOverview(overviewData);
            setDailyActivity(dailyData);
            setCategoryDistribution(categoryData);
        } catch (err) {
            if (requestIdRef.current !== requestId) return;
            if (err instanceof ApiError) {
                setError(err.detail);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load statistics.");
            }
            toast.error("Couldn't load your statistics. Please try again.");
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void load(range);
    }, [range, load]);

    const value = useMemo<StatsContextValue>(
        () => ({
            range,
            setRange,
            overview,
            dailyActivity,
            categoryDistribution,
            isLoading,
            error,
        }),
        [range, overview, dailyActivity, categoryDistribution, isLoading, error],
    );

    return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats(): StatsContextValue {
    const context = useContext(StatsContext);
    if (!context) {
        throw new Error("useStats must be used within a StatsProvider.");
    }
    return context;
}

/**
 * Optional variant of `useStats` that returns `null` outside a
 * `StatsProvider`. Lets components shared across the dashboard (e.g.
 * `QuizAnalyticsCard`) opt into the shared range filter when it's present
 * without crashing when rendered elsewhere.
 */
export function useOptionalStats(): StatsContextValue | null {
    return useContext(StatsContext);
}
