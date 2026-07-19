"use client";

import { Check, Mic, Presentation, Plane, ShoppingBag, Users, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

type TopicOption = {
    label: string;
    value: string;
    description: string;
    icon: LucideIcon;
};

const topicOptions: TopicOption[] = [
    {
        label: "Interviews",
        value: "interviews",
        description: "Answer questions clearly and confidently.",
        icon: Presentation,
    },
    {
        label: "Daily Conversations",
        value: "daily_conversations",
        description: "Speak naturally in everyday situations.",
        icon: Users,
    },
    {
        label: "Travel",
        value: "travel",
        description: "Handle airports, hotels, and directions.",
        icon: Plane,
    },
    {
        label: "Meetings",
        value: "meetings",
        description: "Join calls and workplace discussions.",
        icon: Video,
    },
    {
        label: "Pronunciation",
        value: "pronunciation",
        description: "Make your speech clearer and smoother.",
        icon: Mic,
    },
    {
        label: "Shopping & Services",
        value: "shopping_services",
        description: "Practice real public interactions.",
        icon: ShoppingBag,
    },
];

export default function TopicsPage() {
    const { data, updateField, goNext, goBack } = useOnboarding();
    const isValid = data.topics.length > 0;

    const toggleTopic = (value: string) => {
        const nextTopics = data.topics.includes(value)
            ? data.topics.filter((topic) => topic !== value)
            : [...data.topics, value];

        updateField("topics", nextTopics);
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="topics-heading"
                className="w-full max-w-[820px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-3xl flex-col gap-8">
                    <ProgressBar currentStep={7} totalSteps={11} label="Step 7 of 11" />

                    <div className="space-y-4 text-center">
                        <h1 id="topics-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            What do you want to practice?
                        </h1>
                        <p className="mx-auto max-w-[46ch] text-base leading-7 text-slate-600 sm:text-lg">
                            Select one or more topics you&apos;d like to practice.
                        </p>
                    </div>

                    <fieldset className="grid gap-3 sm:grid-cols-2" aria-label="Choose practice topics">
                        <legend className="sr-only">Practice topics</legend>
                        {topicOptions.map((option) => {
                            const selected = data.topics.includes(option.value);
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleTopic(option.value)}
                                    aria-pressed={selected}
                                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left shadow-sm outline-none transition duration-200 hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-md focus:ring-4 focus:ring-blue-100 active:scale-[0.99] ${selected
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-slate-200 bg-white text-slate-800"
                                        }`}
                                >
                                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-semibold">{option.label}</span>
                                        <span className="mt-1 block text-sm font-medium text-slate-500">{option.description}</span>
                                    </span>
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-transparent"}`}>
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                </button>
                            );
                        })}
                    </fieldset>

                    <OnboardingNavigation onBack={goBack} onNext={goNext} nextDisabled={!isValid} backLabel="Back" nextLabel="Continue" />
                </div>
            </section>
        </main>
    );
}
