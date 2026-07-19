"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { User } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

export default function NamePage() {
    const { data: formData, updateField, goNext, goBack } = useOnboarding();
    const [touched, setTouched] = useState(false);

    const trimmedName = useMemo(() => formData.displayName.trim(), [formData.displayName]);
    const isValid = trimmedName.length > 0;
    const showError = touched && !isValid;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateField("displayName", event.target.value);
    };

    const handleContinue = () => {
        setTouched(true);

        if (!isValid) {
            return;
        }

        updateField("displayName", trimmedName);
        goNext();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleContinue();
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="name-heading"
                className="w-full max-w-[700px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-8" noValidate>
                    <ProgressBar currentStep={2} totalSteps={12} label="Step 2 of 12" />

                    <div className="space-y-4 text-center">
                        <h1 id="name-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            What should we call you?
                        </h1>
                        <p className="mx-auto max-w-[42ch] text-base leading-7 text-slate-600 sm:text-lg">
                            This helps personalize your learning experience.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="displayName" className="text-sm font-semibold text-slate-700">
                            Preferred name
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                                <User className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <input
                                id="displayName"
                                name="displayName"
                                type="text"
                                value={formData.displayName}
                                onChange={handleChange}
                                onBlur={() => setTouched(true)}
                                placeholder="Enter your name"
                                autoFocus
                                aria-invalid={showError}
                                aria-describedby={showError ? "displayName-error" : undefined}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-base font-medium text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                        {showError ? (
                            <p id="displayName-error" className="text-sm font-medium text-red-500" role="alert">
                                Please enter your name.
                            </p>
                        ) : null}
                    </div>

                    <OnboardingNavigation
                        onBack={goBack}
                        onNext={handleContinue}
                        nextDisabled={!isValid}
                        backLabel="Back"
                        nextLabel="Continue"
                    />
                </form>
            </section>
        </main>
    );
}
