export const learningGoalLabels: Record<string, string> = {
    career: "Career & Business",
    travel: "Travel & Culture",
    education: "Education & Academic",
    daily_life: "Daily Conversation",
    exam_prep: "Exams & Test Prep",
    social_confidence: "Social Confidence",
    relocation: "Relocation & Moving",
};

export const proficiencyLevelLabels: Record<string, string> = {
    beginner: "Beginner (A1)",
    elementary: "Elementary (A2)",
    intermediate: "Intermediate (B1)",
    upper_intermediate: "Upper Intermediate (B2)",
    advanced: "Advanced (C1)",
};

// Phase M13 — accent labels are now sourced from the backend's
// AccentManager via `GET /api/accents` (see `features/accent`). The
// duplicated `englishVariantLabels` map has been removed; use
// `useAccent()` (dashboard) or `useAccents()` (onboarding) instead.
