"use client";

/**
 * AISessionReview — Phase 1 AI Conversation Summary Enhancement.
 *
 * Renders a premium AI-generated coaching card that surfaces:
 *  - An overall score gauge (0–100)
 *  - A personalised coach feedback paragraph
 *  - Strengths and areas-for-improvement bullet grids
 *  - A concrete next-step recommendation chip
 *
 * While the backend background task is still running, displays an animated
 * shimmer skeleton so the learner knows the review is on its way.  If the
 * AI generation fails or takes too long (10 polls × 3 s = 30 s) a graceful
 * fallback is shown without blocking the rest of the session review page.
 *
 * All data is read from `useConversation()` — no extra props required.
 */

import { useConversation } from "@/features/conversation/ConversationContext";
import {
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    Sparkles,
    Trophy,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Shimmer skeleton used while isSummaryLoading is true.              *
 * ------------------------------------------------------------------ */

function SkeletonLine({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
            style={{
                animation: "shimmer 1.4s infinite linear",
            }}
        />
    );
}

function AISessionReviewSkeleton() {
    return (
        <section
            aria-label="AI Session Review loading"
            aria-busy="true"
            className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/60 p-5 shadow-sm"
        >
            {/* Header row */}
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 animate-pulse items-center justify-center rounded-xl bg-violet-100">
                    <Sparkles className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                </div>
                <SkeletonLine className="h-4 w-32" />
                <div className="ml-auto">
                    <SkeletonLine className="h-5 w-20 rounded-full" />
                </div>
            </div>

            {/* Score + feedback */}
            <div className="mt-4 flex items-start gap-4">
                <SkeletonLine className="h-16 w-16 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                    <SkeletonLine className="h-3 w-full" />
                    <SkeletonLine className="h-3 w-4/5" />
                    <SkeletonLine className="h-3 w-3/5" />
                </div>
            </div>

            {/* Strengths + areas grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-2 rounded-2xl bg-white/60 p-3">
                    <SkeletonLine className="h-3 w-20 rounded" />
                    <SkeletonLine className="h-2.5 w-full rounded" />
                    <SkeletonLine className="h-2.5 w-4/5 rounded" />
                </div>
                <div className="space-y-2 rounded-2xl bg-white/60 p-3">
                    <SkeletonLine className="h-3 w-24 rounded" />
                    <SkeletonLine className="h-2.5 w-full rounded" />
                    <SkeletonLine className="h-2.5 w-4/5 rounded" />
                </div>
            </div>

            {/* Next recommendation */}
            <SkeletonLine className="mt-3 h-8 w-full rounded-2xl" />

            <p className="mt-3 text-center text-[11px] font-medium text-violet-400">
                Emma is reviewing your session&hellip;
            </p>

            {/* Shimmer keyframes injected inline */}
            <style>{`
                @keyframes shimmer {
                    0%   { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
            `}</style>
        </section>
    );
}

/* ------------------------------------------------------------------ *
 * Score gauge ring (SVG-based circular indicator).                   *
 * ------------------------------------------------------------------ */

function ScoreGauge({ score }: { score: number }) {
    const clamped = Math.max(0, Math.min(100, score));
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const fill = (clamped / 100) * circumference;

    const color =
        clamped >= 80
            ? "#7c3aed" // violet-700
            : clamped >= 60
              ? "#2563eb" // blue-600
              : clamped >= 40
                ? "#d97706" // amber-600
                : "#dc2626"; // red-600

    return (
        <div
            className="relative flex shrink-0 items-center justify-center"
            style={{ width: 72, height: 72 }}
            aria-label={`Overall score: ${clamped} out of 100`}
        >
            <svg
                width="72"
                height="72"
                className="-rotate-90"
                aria-hidden="true"
            >
                {/* Track */}
                <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="6"
                />
                {/* Progress arc */}
                <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${fill} ${circumference - fill}`}
                    className="transition-[stroke-dasharray] duration-700 ease-out"
                />
            </svg>
            <span
                className="absolute text-center text-[13px] font-extrabold leading-none"
                style={{ color }}
            >
                {clamped}
                <span className="block text-[9px] font-semibold text-slate-400">
                    / 100
                </span>
            </span>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Bullet list used for both strengths and areas.                     *
 * ------------------------------------------------------------------ */

type BulletListProps = {
    items: string[];
    variant: "strength" | "area";
};

function BulletList({ items, variant }: BulletListProps) {
    const isStrength = variant === "strength";
    return (
        <ul className="mt-1.5 space-y-1.5" aria-label={isStrength ? "Strengths" : "Areas for improvement"}>
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                    {isStrength ? (
                        <CheckCircle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                            aria-hidden="true"
                        />
                    ) : (
                        <AlertTriangle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                            aria-hidden="true"
                        />
                    )}
                    <span className="text-[12px] leading-relaxed text-slate-700">
                        {item}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/* ------------------------------------------------------------------ *
 * Main exported component.                                           *
 * ------------------------------------------------------------------ */

/**
 * Renders the AI Session Review card.
 *
 * Reads data from `useConversation()` directly so it can be mounted
 * anywhere inside a `<ConversationProvider>` without additional props.
 */
export function AISessionReview() {
    const {
        isSummaryLoading,
        overallScore,
        coachFeedback,
        strengths,
        areasForImprovement,
        nextRecommendation,
        isCompleted,
    } = useConversation();

    // Don't render the card while the session is still active.
    if (!isCompleted) return null;

    // Loading state — show the shimmer skeleton.
    if (isSummaryLoading) {
        return <AISessionReviewSkeleton />;
    }

    // Fallback — no summary available (AI failed or old pre-Phase-1 session).
    if (!coachFeedback) {
        return (
            <section
                aria-label="AI Session Review unavailable"
                className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-5"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-500">
                        AI Session Review
                    </h2>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    Detailed AI feedback is only available for sessions completed after
                    the review feature was introduced. Complete a new practice session
                    to receive personalised coaching insights.
                </p>
            </section>
        );
    }

    // Populated state — render the full review card.
    return (
        <section
            aria-label="AI Session Review"
            className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/70 p-5 shadow-sm"
        >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-extrabold tracking-tight text-slate-800">
                    AI Session Review
                </h2>
                <div className="ml-auto flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5">
                    <Trophy className="h-3 w-3 text-violet-500" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                        Powered by Emma
                    </span>
                </div>
            </div>

            {/* ── Score + Feedback ───────────────────────────────────────── */}
            <div className="mt-4 flex items-start gap-4">
                {overallScore !== null && <ScoreGauge score={overallScore} />}
                <div className="flex-1">
                    {overallScore !== null && (
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Overall Score
                        </p>
                    )}
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
                        {coachFeedback}
                    </p>
                </div>
            </div>

            {/* ── Strengths + Areas grid ─────────────────────────────────── */}
            {((strengths && strengths.length > 0) ||
                (areasForImprovement && areasForImprovement.length > 0)) && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {strengths && strengths.length > 0 && (
                        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 px-3 py-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-600">
                                ✦ Strengths
                            </p>
                            <BulletList items={strengths} variant="strength" />
                        </div>
                    )}
                    {areasForImprovement && areasForImprovement.length > 0 && (
                        <div className="rounded-2xl bg-amber-50/70 border border-amber-100 px-3 py-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600">
                                ✦ Areas to Improve
                            </p>
                            <BulletList items={areasForImprovement} variant="area" />
                        </div>
                    )}
                </div>
            )}

            {/* ── Next Recommendation ───────────────────────────────────── */}
            {nextRecommendation && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 shadow-sm">
                    <ArrowRight
                        className="h-4 w-4 shrink-0 text-violet-200"
                        aria-hidden="true"
                    />
                    <p className="text-[12px] font-semibold leading-snug text-white">
                        <span className="font-extrabold text-violet-200">Next step: </span>
                        {nextRecommendation}
                    </p>
                </div>
            )}
        </section>
    );
}

export default AISessionReview;
