"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingPreferences, saveOnboardingPreferences } from "@/features/onboarding/api";
import type { OnboardingPayload, OnboardingPreferencesResponse } from "@/features/onboarding/types";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/features/auth/api";

type DashboardContextValue = {
    preferences: OnboardingPreferencesResponse | null;
    isLoading: boolean;
    error: string | null;
    refreshPreferences: () => Promise<void>;
    updatePreferences: (payload: OnboardingPayload) => Promise<boolean>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const { status } = useAuth();
    const router = useRouter();
    const [preferences, setPreferences] = useState<OnboardingPreferencesResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const refreshPreferences = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const prefs = await getOnboardingPreferences();
            setPreferences(prefs);
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 404) {
                    // Redirect to onboarding if preferences do not exist yet
                    router.replace("/onboarding");
                    return;
                }
                setError(err.detail);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load dashboard preferences.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const updatePreferences = useCallback(async (payload: OnboardingPayload): Promise<boolean> => {
        setError(null);
        try {
            const updated = await saveOnboardingPreferences(payload);
            setPreferences(updated);
            return true;
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to update preferences.");
            }
            return false;
        }
    }, []);

    // Load preferences when user becomes authenticated
    useEffect(() => {
        if (status === "authenticated") {
            refreshPreferences();
        } else if (status === "unauthenticated") {
            // Clear preferences if user is logged out
            setPreferences(null);
            setIsLoading(false);
            setError(null);
        }
    }, [status, refreshPreferences]);

    const value = useMemo(() => ({
        preferences,
        isLoading,
        error,
        refreshPreferences,
        updatePreferences,
    }), [preferences, isLoading, error, refreshPreferences, updatePreferences]);

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error("useDashboard must be used within a DashboardProvider.");
    }
    return context;
}
