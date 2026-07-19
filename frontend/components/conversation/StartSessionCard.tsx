"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

type StartSessionCardProps = {
    /**
     * Human-readable label of the selected practice mode (e.g. "Speaking Practice").
     * When `null`, the Start Session button is disabled.
     */
    selectedLabel: string | null;
    /**
     * Stable lowercase practice type used as the `practice` URL search param
     * (e.g. "speaking"). Required to enable the button.
     */
    selectedPracticeType: string | null;
    /**
     * Destination route. Defaults to the AI conversation page.
     */
    href?: string;
};

/**
 * "Start Your Practice" card.
 *
 * Renders a disabled CTA until a practice mode is selected, then navigates to
 * the conversation page with the selected practice type as a search param.
 * Reusable across any page that exposes a practice-mode selection.
 */
export default function StartSessionCard({
    selectedLabel,
    selectedPracticeType,
    href = "/dashboard/conversation",
}: StartSessionCardProps) {
    const router = useRouter();
    const isEnabled = Boolean(selectedLabel && selectedPracticeType);

    const handleStart = () => {
        if (!selectedPracticeType) return;
        const params = new URLSearchParams({ practice: selectedPracticeType });
        router.push(`${href}?${params.toString()}`);
    };

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-500">Start your practice</p>
                    <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-900">
                        Begin your AI learning session
                    </h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    AI
                </span>
            </div>

            <p className="text-sm leading-6 text-slate-500">
                Choose a practice mode above, then begin your AI learning session.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Selected practice
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedLabel ?? "None — select a mode above"}
                </p>
            </div>

            <button
                type="button"
                onClick={handleStart}
                disabled={!isEnabled}
                aria-disabled={!isEnabled}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-lg transition ${isEnabled
                        ? "bg-blue-600 text-white shadow-blue-600/20 hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
                        : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                    }`}
            >
                Start Session
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
        </section>
    );
}
