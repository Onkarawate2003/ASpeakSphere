"use client";

import type { ComponentType } from "react";

import { useOnboarding } from "../OnboardingContext";
import AgeGroupPage from "./AgeGroupPage";
import ConfidenceLevelPage from "./ConfidenceLevelPage";
import DailyGoalPage from "./DailyGoalPage";
import EnglishLevelPage from "./EnglishLevelPage";
import EnglishVariantPage from "./EnglishVariantPage";
import FocusAreasPage from "./FocusAreasPage";
import LearningGoalPage from "./LearningGoalPage";
import NamePage from "./NamePage";
import ReminderPreferencesPage from "./ReminderPreferencesPage";
import SummaryPage from "./SummaryPage";
import TopicsPage from "./TopicsPage";
import WelcomePage from "./WelcomePage";

const onboardingPages: ComponentType[] = [
    WelcomePage,       // Step  1
    AgeGroupPage,      // Step  2
    LearningGoalPage,  // Step  3
    EnglishLevelPage,  // Step  4
    ConfidenceLevelPage, // Step 5
    DailyGoalPage,     // Step  6
    TopicsPage,        // Step  7
    FocusAreasPage,    // Step  8
    EnglishVariantPage, // Step  9
    ReminderPreferencesPage, // Step 10
    SummaryPage,       // Step 11
];

export default function OnboardingFlow() {
    const { step } = useOnboarding();
    const currentStep = Math.min(Math.max(step, 0), onboardingPages.length - 1);
    const CurrentPage = onboardingPages[currentStep];

    return <CurrentPage />;
}
