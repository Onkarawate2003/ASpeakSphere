"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { submitOnboardingData } from "./api";
import { initialOnboardingData, ONBOARDING_STORAGE_KEY } from "./constants";
import type { OnboardingData, OnboardingState } from "./types";

type OnboardingContextValue = OnboardingState & {
    updateField: <TKey extends keyof OnboardingData>(key: TKey, value: OnboardingData[TKey]) => void;
    goNext: () => void;
    goBack: () => void;
    goTo: (step: number) => void;
    submit: () => Promise<boolean>;
    reset: () => void;
};

const initialState: OnboardingState = {
    step: 0,
    data: initialOnboardingData,
    status: "in_progress",
    error: null,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function readStoredState(): OnboardingState {
    if (typeof window === "undefined") {
        return initialState;
    }

    try {
        const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!raw) {
            return initialState;
        }

        const parsed = JSON.parse(raw) as Partial<OnboardingState>;
        if (parsed.status === "completed") {
            return initialState;
        }

        return {
            step: typeof parsed.step === "number" ? parsed.step : 0,
            data: { ...initialOnboardingData, ...parsed.data },
            status: parsed.status ?? "in_progress",
            error: parsed.error ?? null,
        };
    } catch {
        return initialState;
    }
}

function persistState(state: OnboardingState) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<OnboardingState>(initialState);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setState(readStoredState());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated && state.status !== "completed") {
            persistState(state);
        }
    }, [hydrated, state]);

    const updateField = useCallback(<TKey extends keyof OnboardingData>(key: TKey, value: OnboardingData[TKey]) => {
        setState((current) => ({
            ...current,
            data: {
                ...current.data,
                [key]: value,
            },
            status: "in_progress",
            error: null,
        }));
    }, []);

    const goNext = useCallback(() => {
        setState((current) => ({ ...current, step: current.step + 1 }));
    }, []);

    const goBack = useCallback(() => {
        setState((current) => ({ ...current, step: Math.max(0, current.step - 1) }));
    }, []);

    const goTo = useCallback((step: number) => {
        setState((current) => ({ ...current, step: Math.max(0, step) }));
    }, []);

    const reset = useCallback(() => {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
        setState(initialState);
    }, []);

    const submit = useCallback(async () => {
        setState((current) => ({ ...current, status: "submitting", error: null }));

        try {
            await submitOnboardingData(state.data);

            if (typeof window !== "undefined") {
                window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
            }

            setState((current) => ({ ...current, status: "completed", error: null }));
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to save onboarding preferences.";
            setState((current) => ({ ...current, status: "error", error: message }));
            return false;
        }
    }, [state.data]);

    const value = useMemo<OnboardingContextValue>(
        () => ({
            ...state,
            updateField,
            goNext,
            goBack,
            goTo,
            submit,
            reset,
        }),
        [goBack, goNext, goTo, reset, state, submit, updateField],
    );

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within an OnboardingProvider.");
    }

    return context;
}
