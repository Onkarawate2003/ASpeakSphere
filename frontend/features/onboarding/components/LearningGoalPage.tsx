"use client";

import { BriefcaseBusiness, Check, GraduationCap, MessageCircle, Plane, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

type LearningGoal = "career" | "travel" | "education" | "daily_life" | "exam_prep";

type LearningGoalFormData = {
    learningGoal?: LearningGoal | null;
};

type LearningGoalOption = {
    title: string;
    value: LearningGoal;
    description: string;
    icon: LucideIcon;
};

const learningGoalOptions: LearningGoalOption[] = [
    {
        title: "Career",
        value: "career",
        description: "Improve your professional communication.",
        icon: BriefcaseBusiness,
    },
    {
        title: "Travel",
        value: "travel",
        description: "Speak confidently while exploring the world.",
        icon: Plane,
    },
    {
        title: "Education",
        value: "education",
        description: "Study and succeed academically.",
        icon: GraduationCap,
    },
    {
        title: "Daily Conversation",
        value: "daily_life",
        description: "Communicate naturally every day.",
        icon: MessageCircle,
    },
    {
        title: "Exams",
        value: "exam_prep",
        description: "Prepare for IELTS, TOEFL and other tests.",
        icon: Trophy,
    },
];

export default function LearningGoalPage() {
    const onboarding = useOnboarding();
    const formData = onboarding.data as LearningGoalFormData;
    const updateField = onboarding.updateField as unknown as (key: "learningGoal", value: LearningGoal) => void;
    const { goNext, goBack } = onboarding;

    const selectedGoal = formData.learningGoal;
    const isValid = Boolean(selectedGoal);

    const handleSelect = (value: LearningGoal) => {
        updateField("learningGoal", value);
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="learning-goal-heading"
                className="w-full max-w-[700px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-xl flex-col gap-8">
                    <ProgressBar currentStep={3} totalSteps={11} label="Step 3 of 11" />

                    <div className="space-y-4 text-center">
                        <h1 id="learning-goal-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            Why are you learning English?
                        </h1>
                        <p className="mx-auto max-w-[42ch] text-base leading-7 text-slate-600 sm:text-lg">
                            Choose the goal that best matches your learning journey.
                        </p>
                    </div>

                    <fieldset className="grid gap-3" aria-label="Choose your English learning goal">
                        <legend className="sr-only">Learning goal</legend>
                        {learningGoalOptions.map((option) => {
                            const selected = selectedGoal === option.value;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    aria-pressed={selected}
                                    aria-label={`Select ${option.title}: ${option.description}`}
                                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm outline-none transition duration-200 hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-md focus:ring-4 focus:ring-blue-100 active:scale-[0.99] ${selected
                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-white text-slate-800"
                                        }`}
                                >
                                    <span
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-200 ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                                            }`}
                                        aria-hidden="true"
                                    >
                                        <Icon className="h-5 w-5" />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-semibold">{option.title}</span>
                                        <span className="mt-1 block text-sm font-medium text-slate-500">{option.description}</span>
                                    </span>

                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition duration-200 ${selected ? "bg-blue-600 text-white opacity-100" : "bg-slate-100 text-transparent opacity-60"
                                            }`}
                                        aria-hidden="true"
                                    >
                                        <Check className="h-4 w-4" />
                                    </span>
                                </button>
                            );
                        })}
                    </fieldset>

                    <OnboardingNavigation
                        onBack={goBack}
                        onNext={goNext}
                        nextDisabled={!isValid}
                        backLabel="Back"
                        nextLabel="Continue"
                    />
                </div>
            </section>
        </main>
    );
}
