"use client";

// Lightweight hook for loading accent metadata outside the dashboard.
//
// Phase M13 — Global English Accent & Voice Personalization.
//
// The dashboard uses `AccentContext` (which also derives the active accent
// from preferences). Onboarding and other pre-dashboard screens only need
// the *list* of accents (labels/descriptions/flags) to render a picker —
// they do not have a preferences context yet. This hook fetches the same
// `GET /api/accents` metadata and falls back to `FALLBACK_ACCENTS` on
// failure, so every accent picker in the app reads from the backend's
// single source of truth.

import { useEffect, useState } from "react";

import { fetchAccents } from "./api";
import { FALLBACK_ACCENTS, type AccentMetadata } from "./types";

export type UseAccentsResult = {
    accents: AccentMetadata[];
    isLoading: boolean;
    error: Error | null;
};

/**
 * Fetch the list of supported accent metadata from `GET /api/accents`.
 *
 * Returns `FALLBACK_ACCENTS` immediately and replaces them with the live
 * data once the endpoint responds. On error, the fallback remains so the
 * UI always has labels to show.
 */
export function useAccents(): UseAccentsResult {
    const [accents, setAccents] = useState<AccentMetadata[]>(FALLBACK_ACCENTS);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let active = true;

        fetchAccents()
            .then((metadata) => {
                if (active && metadata.length > 0) {
                    setAccents(metadata);
                }
            })
            .catch((err: unknown) => {
                if (active) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            })
            .finally(() => {
                if (active) {
                    setIsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    return { accents, isLoading, error };
}
