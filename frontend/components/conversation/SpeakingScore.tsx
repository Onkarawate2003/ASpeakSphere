"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { countByRole } from "@/features/conversation/utils";

type ScoreKey = "pronunciation" | "fluency" | "confidence" | "vocabulary";

type ScoreMetric = {
    key: ScoreKey;
    label: string;
    description: string;
    /** Tailwind gradient classes for the progress bar fill. */
    barClass: string;
    /** Tailwind text color for the metric icon/badge. */
    accentClass: string;
};

const METRICS: ScoreMetric[] = [
    {
        key: "pronunciation",
        label: "Pronunciation",
        description: "Clarity and accuracy of sounds",
        barClass: "from-blue-500 to-indigo-500",
        accentClass: "text-blue-600",
    },
    {
        key: "fluency",
        label: "Fluency",
        description: "Smoothness and pace of speech",
        barClass: "from-emerald-500 to-teal-500",
        accentClass: "text-emerald-600",
    },
    {
        key: "confidence",
        label: "Confidence",
        description: "Assertiveness and consistency",
        barClass: "from-amber-500 to-orange-500",
        accentClass: "text-amber-600",
    },
    {
        key: "vocabulary",
        label: "Vocabulary",
        description: "Range and variety of words",
        barClass: "from-fuchsia-500 to-pink-500",
        accentClass: "text-fuchsia-600",
    },
];

type Scores = Record<ScoreKey, number>;

/** Baseline scores shown before the session starts. */
const BASELINE_SCORES: Scores = {
    pronunciation: 0,
    fluency: 0,
    confidence: 0,
    vocabulary: 0,
};

/**
 * Generate deterministic, locally-computed speaking scores from the
 * current conversation state.
 *
 * The values are simulated (no backend, no audio analysis) but they
 * grow with engagement so the bars feel responsive:
 *   - Each user turn nudges every metric up by a small, metric-specific
 *     increment (capped at a per-metric ceiling).
 *   - Completion adds a small bonus so finished sessions score higher.
 *   - A tiny deterministic offset per metric keeps the four bars from
 *     looking identical.
 *
 * Everything is derived from `messages` + `isCompleted`, so the scores
 * stay in sync with the existing chat engine without duplicating logic.
 */
function generateScores(
    userTurns: number,
    completed: boolean,
): Scores {
    // Per-metric growth rate and ceiling.
    const config: Record<ScoreKey, { step: number; ceiling: number; offset: number }> = {
        pronunciation: { step: 7, ceiling: 88, offset: 4 },
        fluency: { step: 8, ceiling: 90, offset: 2 },
        confidence: { step: 6, ceiling: 85, offset: 6 },
        vocabulary: { step: 5, ceiling: 82, offset: 3 },
    };

    const completionBonus = completed ? 8 : 0;

    const scores = {} as Scores;
    (Object.keys(config) as ScoreKey[]).forEach((key) => {
        const { step, ceiling, offset } = config[key];
        const raw = offset + userTurns * step + completionBonus;
        scores[key] = Math.max(0, Math.min(100, Math.round(raw)));
        // Respect the ceiling unless the session is completed.
        if (!completed && scores[key] > ceiling) {
            scores[key] = ceiling;
        }
    });

    return scores;
}

type SpeakingScoreProps = {
    /**
     * When true, the bars animate from their previous value to the new
     * value on update (a subtle "fill" effect). Defaults to true.
     */
    animate?: boolean;
};

/**
 * Speaking Score card.
 *
 * Displays four simulated speaking metrics — Pronunciation, Fluency,
 * Confidence, and Vocabulary — as labeled progress bars. The values
 * are generated entirely on the frontend from the conversation state
 * (number of user turns + completion), so there is no backend, no
 * audio analysis, and no network call.
 *
 * Before the session starts all bars sit at 0%. As the learner
 * exchanges messages the bars grow, and completing the session adds a
 * small bonus. The card is read-only (no inputs) and accessible via
 * `role="meter"` on each bar.
 */
export default function SpeakingScore({ animate = true }: SpeakingScoreProps) {
    const { messages, status, isCompleted } = useConversation();
    const { user: userTurns } = useMemo(() => countByRole(messages), [messages]);

    const targetScores = useMemo<Scores>(
        () => generateScores(userTurns, isCompleted),
        [userTurns, isCompleted],
    );

    // Animate the bars toward their target values.
    const [displayed, setDisplayed] = useState<Scores>(BASELINE_SCORES);

    useEffect(() => {
        if (!animate) {
            setDisplayed(targetScores);
            return;
        }
        // Smoothly step each metric toward its target.
        const interval = setInterval(() => {
            setDisplayed((prev) => {
                let done = true;
                const next = {} as Scores;
                (Object.keys(prev) as ScoreKey[]).forEach((key) => {
                    const current = prev[key];
                    const target = targetScores[key];
                    if (current === target) {
                        next[key] = current;
                        return;
                    }
                    done = false;
                    const diff = target - current;
                    const step = Math.sign(diff) * Math.max(1, Math.abs(diff) * 0.2);
                    next[key] =
                        Math.sign(diff) > 0
                            ? Math.min(target, current + step)
                            : Math.max(target, current + step);
                    next[key] = Math.round(next[key]);
                });
                if (done) {
                    clearInterval(interval);
                }
                return next;
            });
        }, 60);
        return () => clearInterval(interval);
    }, [targetScores, animate]);

    const sessionStarted = status !== "idle";

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Speaking score"
        >
            <div className="mb-4 flex items-center gap-2">
                <Gauge
                    className="h-4 w-4 text-indigo-600"
                    aria-hidden="true"
                />
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                    Speaking Score
                </h2>
                <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                    Simulated
                </span>
            </div>

            {!sessionStarted ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs leading-relaxed text-slate-400">
                    Your speaking scores will appear here once you start
                    practicing.
                </p>
            ) : (
                <ul className="space-y-4">
                    {METRICS.map((metric) => {
                        const value = displayed[metric.key];
                        return (
                            <li key={metric.key}>
                                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                                    <div className="min-w-0">
                                        <span className={`text-sm font-bold ${metric.accentClass}`}>
                                            {metric.label}
                                        </span>
                                        <span className="ml-2 text-[11px] text-slate-400">
                                            {metric.description}
                                        </span>
                                    </div>
                                    <span
                                        className="flex-shrink-0 text-sm font-extrabold tabular-nums text-slate-900"
                                        aria-hidden="true"
                                    >
                                        {value}%
                                    </span>
                                </div>
                                <div
                                    className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                                    role="meter"
                                    aria-valuenow={value}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${metric.label} score: ${value} percent`}
                                >
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${metric.barClass} transition-[width] duration-500 ease-out`}
                                        style={{ width: `${value}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {sessionStarted && (
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                    Scores are simulated for this preview and update as you
                    practice. Real voice analysis arrives with full voice
                    mode.
                </p>
            )}
        </section>
    );
}
