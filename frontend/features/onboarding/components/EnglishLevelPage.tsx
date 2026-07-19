"use client";

import { BookOpen, Check, MessageSquare, Sparkles, Star, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

type EnglishLevel = "beginner" | "elementary" | "intermediate" | "upper_intermediate" | "advanced";

type EnglishLevelFormData = {
    englishLevel?: EnglishLevel | null;
};

type EnglishLevelOption = {
    title: string;
    value: EnglishLevel;
    description: string;
    icon: LucideIcon;
};

const englishLevelOptions: EnglishLevelOption[] = [
    {
        title: "Beginner",
        value: "beginner",
        description: "I know only a few English words.",
        icon: UserRound,
    },
    {
        title: "Elementary",
        value: "elementary",
        description: "I can understand and use simple phrases.",
        icon: BookOpen,
    },
    {
        title: "Intermediate",
        value: "intermediate",
        description: "I can communicate in everyday situations.",
        icon: MessageSquare,
    },
    {
        title: "Upper Intermediate",
        value: "upper_intermediate",
        description: "I can discuss most topics confidently.",
        icon: Sparkles,
    },
    {
        title: "Advanced",
        value: "advanced",
        description: "I speak English fluently in most situations.",
        icon: Star,
    },
];

export default function EnglishLevelPage() {
    const onboarding = useOnboarding();
    const formData = onboarding.data as EnglishLevelFormData;
    const updateField = onboarding.updateField as unknown as (key: "englishLevel", value: EnglishLevel) => void;
    const { goNext, goBack } = onboarding;

    const selectedLevel = formData.englishLevel;
    const isValid = Boolean(selectedLevel);

    const handleSelect = (value: EnglishLevel) => {
        updateField("englishLevel", value);
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="english-level-heading"
                className="w-full max-w-[700px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-xl flex-col gap-8">
                    <ProgressBar currentStep={4} totalSteps={11} label="Step 4 of 11" />

                    <div className="space-y-4 text-center">
                        <h1 id="english-level-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            What is your current English level?
                        </h1>
                        <p className="mx-auto max-w-[42ch] text-base leading-7 text-slate-600 sm:text-lg">
                            Choose the option that best describes your current ability.
                        </p>
                    </div>

                    <fieldset className="grid gap-3" aria-label="Choose your current English level">
                        <legend className="sr-only">English level</legend>
                        {englishLevelOptions.map((option) => {
                            const selected = selectedLevel === option.value;
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
