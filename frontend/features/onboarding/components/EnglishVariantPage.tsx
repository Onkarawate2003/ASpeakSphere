"use client";

import { Check, Globe2, Map, Sparkles, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import type { EnglishVariant } from "../types";
import { useAccents } from "@/features/accent/useAccents";
import type { AccentMetadata } from "@/features/accent/types";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

/**
 * Per-accent icon mapping. The icon is a purely presentational concern of
 * the onboarding UI; the label and description come from the backend's
 * AccentManager (via `/api/accents`) so the accent list is never
 * duplicated. If the backend adds a new accent without an icon here, it
 * falls back to `Globe2`.
 */
const ACCENT_ICONS: Record<string, LucideIcon> = {
    us: Globe2,
    uk: Map,
    australian: Waves,
    neutral: Sparkles,
};

type EnglishVariantOption = {
    code: EnglishVariant;
    label: string;
    description: string;
    icon: LucideIcon;
};

/**
 * Build the picker options from the backend accent metadata, attaching the
 * presentational icon by code. Falls back to `Globe2` for unknown codes.
 */
function toOptions(accents: AccentMetadata[]): EnglishVariantOption[] {
    return accents.map((a) => ({
        code: a.code as EnglishVariant,
        label: a.label,
        description: a.description,
        icon: ACCENT_ICONS[a.code] ?? Globe2,
    }));
}

export default function EnglishVariantPage() {
    const { data, updateField, goNext, goBack } = useOnboarding();
    // Phase M13 — accent options come from the backend's AccentManager via
    // /api/accents (single source of truth). Falls back to FALLBACK_ACCENTS
    // if the endpoint is unreachable, so onboarding never breaks.
    const { accents } = useAccents();
    const options = toOptions(accents);

    const isValid = Boolean(data.englishVariant);

    const handleSelect = (value: EnglishVariant) => {
        updateField("englishVariant", value);
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="english-variant-heading"
                className="w-full max-w-[760px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-2xl flex-col gap-8">
                    <ProgressBar currentStep={9} totalSteps={11} label="Step 9 of 11" />

                    <div className="space-y-4 text-center">
                        <h1 id="english-variant-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            Which English style do you prefer?
                        </h1>
                        <p className="mx-auto max-w-[46ch] text-base leading-7 text-slate-600 sm:text-lg">
                            We will use this to shape examples, vocabulary, and listening practice.
                        </p>
                    </div>

                    <fieldset className="grid gap-3 sm:grid-cols-2" aria-label="Choose preferred English variant">
                        <legend className="sr-only">Preferred English variant</legend>
                        {options.map((option) => {
                            const selected = data.englishVariant === option.code;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.code}
                                    type="button"
                                    onClick={() => handleSelect(option.code)}
                                    aria-pressed={selected}
                                    className={`flex min-h-36 flex-col justify-between rounded-2xl border p-5 text-left shadow-sm outline-none transition duration-200 hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-md focus:ring-4 focus:ring-blue-100 active:scale-[0.99] ${selected
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-slate-200 bg-white text-slate-800"
                                        }`}
                                >
                                    <span className="flex items-start justify-between gap-4">
                                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-transparent"}`}>
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    </span>
                                    <span>
                                        <span className="block text-lg font-bold">{option.label}</span>
                                        <span className="mt-1 block text-sm font-medium text-slate-500">{option.description}</span>
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
