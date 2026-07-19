"use client";

// Accent Context — the frontend's single source of truth for the active
// English accent.
//
// Phase M13 — Global English Accent & Voice Personalization.
//
// The backend already applies the user's accent everywhere (AI prompts,
// TTS voice, STT hints, quiz grading). On the frontend we only need to:
//
//   1. Know which accent is active (for display in the dashboard /
//      profile / settings).
//   2. Provide accent metadata (labels, flags, descriptions) so pickers
//      render from the backend's AccentManager — no duplicated list.
//
// The active accent is DERIVED from `useDashboard().preferences` (the
// onboarding/preferences response), which itself mirrors
// `user_preferences.english_variant`. This means:
//   - There is exactly one place to read the accent on the frontend.
//   - When the user changes their accent in Settings and the preferences
//     refresh, every consumer of `useAccent()` re-renders immediately —
//     no logout, restart, or cache clear required (Phase 11 requirement).
//
// Accent metadata is loaded once from the public `GET /api/accents`
// endpoint and cached for the provider's lifetime. If the endpoint is
// unreachable, `FALLBACK_ACCENTS` is used so the UI still renders.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { useDashboard } from "@/features/dashboard/DashboardContext";
import { fetchAccents } from "./api";
import {
    DEFAULT_ACCENT,
    FALLBACK_ACCENTS,
    type AccentCode,
    type AccentMetadata,
} from "./types";

export type AccentContextValue = {
    /**
     * The active accent code for the current user, derived from their
     * preferences. Falls back to `DEFAULT_ACCENT` (`"us"`) when no
     * preference is set, mirroring the backend's AccentManager default.
     */
    accent: AccentCode;
    /**
     * Whether the user has explicitly chosen an accent (`false` when
     * falling back to the default). Useful for showing "No preference"
     * in the UI.
     */
    hasAccent: boolean;
    /**
     * Human-readable label for the active accent (e.g. "British English"),
     * resolved from the loaded metadata. Falls back to the raw code if
     * the metadata has not loaded yet.
     */
    accentLabel: string;
    /**
     * Metadata for the active accent, or `null` while loading / unknown.
     */
    accentMetadata: AccentMetadata | null;
    /**
     * Full list of supported accent metadata, loaded from
     * `GET /api/accents`. Used to render pickers in onboarding/settings.
     * Starts as `FALLBACK_ACCENTS` and is replaced with the live data
     * once the endpoint responds.
     */
    accents: AccentMetadata[];
    /**
     * Whether accent metadata is currently loading from the backend.
     */
    isLoadingAccents: boolean;
    /**
     * Re-fetch accent metadata from the backend (rarely needed — the
     * list is static per deployment).
     */
    refreshAccents: () => Promise<void>;
};

const AccentContext = createContext<AccentContextValue | null>(null);

export function AccentProvider({ children }: { children: ReactNode }) {
    // The active accent is derived from the dashboard preferences, which
    // are the frontend mirror of `user_preferences.english_variant`.
    const { preferences } = useDashboard();

    const [accents, setAccents] = useState<AccentMetadata[]>(FALLBACK_ACCENTS);
    const [isLoadingAccents, setIsLoadingAccents] = useState<boolean>(true);

    const loadAccents = useCallback(async () => {
        setIsLoadingAccents(true);
        try {
            const metadata = await fetchAccents();
            if (metadata.length > 0) {
                setAccents(metadata);
            }
            // If the endpoint returns an empty list, keep the fallback.
        } catch {
            // Network/endpoint failure — keep FALLBACK_ACCENTS so the UI
            // still renders. We intentionally swallow the error here; the
            // accent picker is non-critical and the labels are identical.
        } finally {
            setIsLoadingAccents(false);
        }
    }, []);

    // Load accent metadata once on mount. The list is static per
    // deployment, so we do not re-fetch on every render.
    useEffect(() => {
        loadAccents();
    }, [loadAccents]);

    // Derive the active accent from preferences. `preferences` is `null`
    // until the dashboard loads; we fall back to the default accent in
    // that case (matching the backend's AccentManager behavior).
    const rawAccent = preferences?.english_variant ?? null;
    const hasAccent = Boolean(rawAccent);
    const accent: AccentCode = hasAccent ? (rawAccent as AccentCode) : DEFAULT_ACCENT;

    // Resolve the active accent's metadata + label from the loaded list.
    const accentMetadata = useMemo(
        () => accents.find((a) => a.code === accent) ?? null,
        [accents, accent],
    );
    const accentLabel = accentMetadata?.label ?? accent;

    const value = useMemo<AccentContextValue>(
        () => ({
            accent,
            hasAccent,
            accentLabel,
            accentMetadata,
            accents,
            isLoadingAccents,
            refreshAccents: loadAccents,
        }),
        [
            accent,
            hasAccent,
            accentLabel,
            accentMetadata,
            accents,
            isLoadingAccents,
            loadAccents,
        ],
    );

    return (
        <AccentContext.Provider value={value}>
            {children}
        </AccentContext.Provider>
    );
}

/**
 * Access the active accent and accent metadata.
 *
 * Must be used within an `AccentProvider` (which must itself be nested
 * inside a `DashboardProvider`).
 */
export function useAccent(): AccentContextValue {
    const context = useContext(AccentContext);
    if (!context) {
        throw new Error("useAccent must be used within an AccentProvider.");
    }
    return context;
}
