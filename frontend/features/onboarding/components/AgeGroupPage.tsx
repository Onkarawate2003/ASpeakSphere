"use client";

import { Check } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

type AgeGroup = "under_18" | "18_24" | "25_34" | "35_44" | "45_plus";

type AgeGroupFormData = {
    ageGroup?: AgeGroup;
};

const ageOptions: Array<{ label: string; value: AgeGroup }> = [
    { label: "Under 18", value: "under_18" },
    { label: "18-24", value: "18_24" },
    { label: "25-34", value: "25_34" },
    { label: "35-44", value: "35_44" },
    { label: "45+", value: "45_plus" },
];

export default function AgeGroupPage() {
    const onboarding = useOnboarding();
    const formData = onboarding.data as AgeGroupFormData;
    const updateField = onboarding.updateField as unknown as (key: "ageGroup", value: AgeGroup) => void;
    const { goNext, goBack } = onboarding;

    const selectedAgeGroup = formData.ageGroup;
    const isValid = Boolean(selectedAgeGroup);

    const handleSelect = (value: AgeGroup) => {
        updateField("ageGroup", value);
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="age-group-heading"
                className="w-full max-w-[700px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-xl flex-col gap-8">
                    <ProgressBar currentStep={2} totalSteps={11} label="Step 2 of 11" />

                    <div className="space-y-4 text-center">
                        <h1 id="age-group-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            Which age group best describes you?
                        </h1>
                        <p className="mx-auto max-w-[42ch] text-base leading-7 text-slate-600 sm:text-lg">
                            This helps us personalize your learning journey.
                        </p>
                    </div>

                    <fieldset className="space-y-3" aria-label="Choose your age group">
                        <legend className="sr-only">Age group</legend>
                        {ageOptions.map((option) => {
                            const selected = selectedAgeGroup === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    aria-pressed={selected}
                                    aria-label={`Select age group ${option.label}`}
                                    className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-base font-semibold shadow-sm outline-none transition duration-200 hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50/70 focus:ring-4 focus:ring-blue-100 active:scale-[0.99] ${selected
                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-white text-slate-800"
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    <span
                                        className={`flex h-7 w-7 items-center justify-center rounded-full transition duration-200 ${selected ? "bg-blue-600 text-white opacity-100" : "bg-slate-100 text-transparent opacity-60"
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
