"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

const formatText = (value: string | null | undefined) => {
    if (!value) {
        return "Not selected";
    }

    return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

export default function SummaryPage() {
    const router = useRouter();
    const { data, submit, goBack, status, error } = useOnboarding();
    const { refreshUser } = useAuth();
    const loading = status === "submitting";

    const handleFinish = async () => {
        const success = await submit();
        if (success) {
            // The backend has now created the user's preferences row, so
            // /me will report onboarding_completed=true. Refresh the cached
            // auth user so the dashboard sees the updated onboarding state
            // before we navigate there.
            await refreshUser();
            router.push("/dashboard");
        }
    };

    const summaryItems = [
        { label: "Age group", value: formatText(data.ageGroup) },
        { label: "Learning goal", value: formatText(data.learningGoal) },
        { label: "English level", value: formatText(data.englishLevel ?? data.proficiencyLevel) },
        { label: "Daily goal", value: data.dailyGoalMinutes ? `${data.dailyGoalMinutes} minutes` : "Not selected" },
        { label: "Topics", value: data.topics.length > 0 ? data.topics.map(formatText).join(", ") : "Not selected" },
        { label: "Focus areas", value: data.focusAreas.length > 0 ? data.focusAreas.map(formatText).join(", ") : "Not selected" },
        { label: "English variant", value: formatText(data.englishVariant) },
        { label: "Reminders", value: data.notificationsEnabled ? `${formatText(data.reminderFrequency)} at ${data.reminderTime}` : "Off" },
    ];

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="summary-heading"
                className="w-full max-w-[820px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-3xl flex-col gap-8">
                    <ProgressBar currentStep={11} totalSteps={11} label="Step 11 of 11" />

                    <div className="space-y-4 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                            {loading ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" /> : <Sparkles className="h-7 w-7" aria-hidden="true" />}
                        </div>
                        <h1 id="summary-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            Your speaking plan is ready
                        </h1>
                        <p className="mx-auto max-w-[48ch] text-base leading-7 text-slate-600 sm:text-lg">
                            Review your choices, then save your preferences and open your dashboard.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {summaryItems.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium leading-6 text-blue-800">
                        <div className="flex gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                            <p>ASpeakSphere will use this setup to personalize practice paths, daily goals, and future AI speaking modules.</p>
                        </div>
                    </div>

                    {error ? (
                        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                            {error}
                        </p>
                    ) : null}

                    <OnboardingNavigation
                        onBack={goBack}
                        onNext={handleFinish}
                        nextDisabled={loading}
                        loading={loading}
                        backLabel="Back"
                        nextLabel="Finish setup"
                    />
                </div>
            </section>
        </main>
    );
}
