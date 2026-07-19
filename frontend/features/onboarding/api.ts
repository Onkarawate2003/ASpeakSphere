import { authedFetch } from "@/features/auth/api";
import { toOnboardingPayload } from "./constants";
import type { OnboardingData, OnboardingPayload, OnboardingPreferencesResponse } from "./types";

export function getOnboardingPreferences(): Promise<OnboardingPreferencesResponse> {
    return authedFetch<OnboardingPreferencesResponse>("/onboarding/preferences");
}

export function saveOnboardingPreferences(
    payload: OnboardingPayload,
): Promise<OnboardingPreferencesResponse> {
    return authedFetch<OnboardingPreferencesResponse>("/onboarding/preferences", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function submitOnboardingData(data: OnboardingData): Promise<OnboardingPreferencesResponse> {
    const payload = toOnboardingPayload(data);
    return saveOnboardingPreferences(payload);
}
