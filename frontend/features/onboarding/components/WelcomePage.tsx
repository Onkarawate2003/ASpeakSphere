"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

export default function WelcomePage() {
    const { goNext } = useOnboarding();

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="welcome-heading"
                className="w-full max-w-[700px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        Personalized English learning
                    </div>

                    <div className="mb-8 flex w-full justify-center">
                        <Image
                            src="/Illustration.jpg"
                            alt="Illustration of a learner starting an online English lesson"
                            width={360}
                            height={360}
                            priority
                            className="h-auto w-full max-w-[280px] drop-shadow-xl transition duration-500 hover:scale-[1.02] sm:max-w-[340px]"
                        />
                    </div>

                    <div className="w-full space-y-6">
                        <ProgressBar currentStep={1} totalSteps={11} label="Step 1 of 11" />

                        <div className="space-y-4">
                            <h1 id="welcome-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                                Welcome to ASpeakSphere
                            </h1>
                            <p className="mx-auto max-w-[46ch] text-base leading-7 text-slate-600 sm:text-lg">
                                Let's personalize your English learning journey in just a few quick steps.
                            </p>
                        </div>

                        <div className="pt-2">
                            <OnboardingNavigation
                                onNext={goNext}
                                nextLabel="Let's Get Started"
                                showBack={false}
                            />
                            <p className="mt-4 text-sm font-medium text-slate-500">About 1 minute to complete</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
