import type { OnboardingData, OnboardingPayload } from "./types";

export const ONBOARDING_STORAGE_KEY = "aspeaksphere:onboarding:v1";
export const ONBOARDING_TOTAL_MANDATORY_STEPS = 12;

export const initialOnboardingData: OnboardingData = {
    displayName: "",
    ageGroup: null,
    learningGoal: null,
    englishLevel: null,
    proficiencyLevel: null,
    levelConfidence: true,
    dailyGoalMinutes: 10,
    goalTier: "regular",
    topics: [],
    focusAreas: [],
    englishVariant: null,
    notificationsEnabled: false,
    reminderTime: null,
    reminderFrequency: null,
    channels: [],
};

export function toOnboardingPayload(data: OnboardingData): OnboardingPayload {
    const proficiencyLevel = data.englishLevel ?? data.proficiencyLevel;

    if (!data.ageGroup || !data.learningGoal || !proficiencyLevel || !data.dailyGoalMinutes || !data.goalTier) {
        throw new Error("Please complete all required onboarding fields before finishing.");
    }

    return {
        // display_name is NOT collected during onboarding. It starts as NULL and
        // can only be set later via Settings → user_preferences.display_name.
        display_name: null,
        learning_goal: data.learningGoal,
        proficiency_level: proficiencyLevel,
        level_confidence: data.levelConfidence,
        daily_goal_minutes: data.dailyGoalMinutes,
        goal_tier: data.goalTier,
        topics: data.topics,
        focus_areas: data.focusAreas,
        english_variant: data.englishVariant,
        notifications_enabled: data.notificationsEnabled,
        reminder_time: data.reminderTime,
        reminder_frequency: data.reminderFrequency,
        channels: data.channels,
    };
}
