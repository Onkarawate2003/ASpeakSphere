"use client";

import { Award } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import {
    DURATION_LABEL,
    MESSAGES_LABEL,
    PARTICIPATION_LABEL,
    PRACTICE_LABEL_SUMMARY,
    PROGRESS_LABEL,
    SESSION_COMPLETED_HEADLINE,
} from "@/features/conversation/constants";
import {
    calculateParticipationScore,
    countByRole,
    formatTimer,
    getParticipationTier,
} from "@/features/conversation/utils";
import ConversationStats from "./ConversationStats";

/**
 * Professional session summary card shown once the practice is completed.
 *
 * Displays:
 *  - "🎉 Session Completed" headline
 *  - Practice mode
 *  - Total duration
 *  - User / AI message counts
 *  - Completion (100%)
 *  - Participation score (auto-calculated) with a tier label
 *
 * All values are derived from ConversationContext — no duplicated state.
 * The card uses the SpeakSphere design language (rounded card, soft
 * shadow, blue/emerald accents) and is animated on mount via the
 * `spk-summary-enter` class (fade + upward + soft scale).
 */
export default function ConversationSummary() {
    const {
        practiceLabel,
        lessonTitle,
        messages,
        elapsedSeconds,
        isCompleted,
        status,
    } = useConversation();

    const completed = isCompleted || status === "ended";
    const { user, ai } = countByRole(messages);
    const score = calculateParticipationScore(
        messages.length,
        completed,
        elapsedSeconds,
    );
    const tier = getParticipationTier(score);

    const tierAccent =
        tier === "Excellent"
            ? "text-emerald-600"
            : tier === "Good"
                ? "text-blue-600"
                : "text-amber-600";

    return (
        <section
            className="spk-summary-enter rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            role="region"
            aria-label="Session summary"
            aria-live="polite"
        >
            {/* Headline */}
            <h2 className="text-xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-2xl">
                {SESSION_COMPLETED_HEADLINE}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
                Session completed successfully. Here's how you did.
            </p>

            {/* Phase 9 — when a lesson was selected, show its name above the
                facts grid so the learner can see which lesson they completed. */}
            {lessonTitle ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-blue-500">
                        Lesson
                    </span>
                    <span className="text-sm font-extrabold text-blue-700">
                        {lessonTitle}
                    </span>
                </div>
            ) : null}

            {/* Key facts grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryFact label={PRACTICE_LABEL_SUMMARY} value={practiceLabel} />
                <SummaryFact label={DURATION_LABEL} value={formatTimer(elapsedSeconds)} />
                <SummaryFact
                    label={MESSAGES_LABEL}
                    value={`${user} User · ${ai} AI`}
                />
                <SummaryFact label={PROGRESS_LABEL} value="100%" />
            </div>

            {/* Detailed stats */}
            <div className="mt-4">
                <ConversationStats />
            </div>

            {/* Participation score */}
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Award className="h-6 w-6 text-amber-500" />
                    </span>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {PARTICIPATION_LABEL}
                        </p>
                        <p className={`text-base font-extrabold ${tierAccent}`}>
                            {tier} ({score}%)
                        </p>
                    </div>
                </div>
                <div
                    className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 sm:w-32"
                    role="progressbar"
                    aria-label="Participation score"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={score}
                >
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700 ease-out"
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>
        </section>
    );
}

/** Small labelled fact used in the summary grid. */
function SummaryFact({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-slate-800">
                {value}
            </p>
        </div>
    );
}
