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

import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/features/auth/api";
import { getProgress } from "./api";
import type { ProgressResponseDTO } from "./types";

type ProgressContextValue = {
    /** The current progress record (null until first successful fetch). */
    progress: ProgressResponseDTO | null;
    /** True while the initial fetch is in flight. */
    isLoading: boolean;
    /** Error message from the last fetch (null when clean). */
    error: string | null;
    /**
     * Re-fetch the progress record from the backend. Use this after a
     * lesson/conversation completion so the dashboard reflects the new XP.
     * Safe to call repeatedly — a guard prevents overlapping requests.
     */
    refreshProgress: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Progress provider — the single source of truth for the user's XP, level,
 * streak and counters (Phase 10).
 *
 * Behaviour:
 *  - Fetches progress once the user becomes authenticated.
 *  - Clears progress on logout.
 *  - Exposes `refreshProgress` so the conversation completion flow can
 *    trigger a single re-fetch (avoiding unnecessary API calls — the
 *    progress is only re-fetched when something actually changed).
 *  - A ref guard prevents overlapping refresh requests so rapid completion
 *    events don't fan out into duplicate GETs.
 */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
    const { status } = useAuth();
    const [progress, setProgress] = useState<ProgressResponseDTO | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Guard against overlapping refresh requests so multiple completion
    // events in quick succession don't trigger duplicate GETs.
    const inFlightRef = useRef<boolean>(false);
    // Track whether we have ever fetched successfully so the initial load
    // state is only shown once.
    const hasFetchedRef = useRef<boolean>(false);

    const refreshProgress = useCallback(async () => {
        // Avoid overlapping requests.
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        // Only show the loading skeleton on the very first fetch; subsequent
        // refreshes (e.g. after a completion) keep the stale data visible so
        // the dashboard doesn't flash.
        if (!hasFetchedRef.current) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const data = await getProgress();
            setProgress(data);
            hasFetchedRef.current = true;
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load progress.");
            }
            // Non-fatal: the dashboard can still render with zeroed values.
            // Surface a toast so the learner knows progress is stale.
            if (hasFetchedRef.current) {
                toast.error("Couldn't refresh your progress. Showing the last known values.");
            }
        } finally {
            setIsLoading(false);
            inFlightRef.current = false;
        }
    }, []);

    // Fetch progress when the user becomes authenticated; clear on logout.
    useEffect(() => {
        if (status === "authenticated") {
            void refreshProgress();
        } else if (status === "unauthenticated") {
            setProgress(null);
            setIsLoading(false);
            setError(null);
            hasFetchedRef.current = false;
        }
    }, [status, refreshProgress]);

    const value = useMemo<ProgressContextValue>(
        () => ({
            progress,
            isLoading,
            error,
            refreshProgress,
        }),
        [progress, isLoading, error, refreshProgress],
    );

    return (
        <ProgressContext.Provider value={value}>
            {children}
        </ProgressContext.Provider>
    );
}

export function useProgress() {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error("useProgress must be used within a ProgressProvider.");
    }
    return context;
}
