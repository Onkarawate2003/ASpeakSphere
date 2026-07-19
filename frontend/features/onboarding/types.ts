export type LearningGoal =
    | "career"
    | "education"
    | "travel"
    | "daily_life"
    | "exam_prep"
    | "social_confidence"
    | "relocation";

export type ProficiencyLevel =
    | "beginner"
    | "elementary"
    | "intermediate"
    | "upper_intermediate"
    | "advanced";

export type GoalTier = "casual" | "regular" | "serious" | "intense";
export type EnglishVariant = "us" | "uk" | "australian" | "neutral";
export type ReminderFrequency = "daily" | "weekdays" | "custom";
export type NotificationChannel = "push" | "email";
export type OnboardingStatus = "in_progress" | "submitting" | "completed" | "error";
export type AgeGroup = "under_18" | "18_24" | "25_34" | "35_44" | "45_plus";
export type EnglishLevel = ProficiencyLevel;

export type OnboardingData = {
    displayName: string;
    ageGroup: AgeGroup | null;
    learningGoal: LearningGoal | null;
    englishLevel: EnglishLevel | null;
    proficiencyLevel: ProficiencyLevel | null;
    levelConfidence: boolean;
    dailyGoalMinutes: number | null;
    goalTier: GoalTier | null;
    topics: string[];
    focusAreas: string[];
    englishVariant: EnglishVariant | null;
    notificationsEnabled: boolean;
    reminderTime: string | null;
    reminderFrequency: ReminderFrequency | null;
    channels: NotificationChannel[];
};

export type OnboardingPayload = {
    display_name: string | null;
    learning_goal: LearningGoal;
    proficiency_level: ProficiencyLevel;
    level_confidence: boolean;
    daily_goal_minutes: number;
    goal_tier: GoalTier;
    topics: string[];
    focus_areas: string[];
    english_variant: EnglishVariant | null;
    notifications_enabled: boolean;
    reminder_time: string | null;
    reminder_frequency: ReminderFrequency | null;
    channels: NotificationChannel[];
};

export type OnboardingPreferencesResponse = OnboardingPayload & {
    id: number;
    user_id: number;
    onboarding_completed: boolean;
};

export type OnboardingState = {
    step: number;
    data: OnboardingData;
    status: OnboardingStatus;
    error: string | null;
};
