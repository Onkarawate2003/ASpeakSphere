"use client";

import { useRouter } from "next/navigation";
import {
    Award,
    CheckCircle2,
    Home,
    Lightbulb,
    RotateCcw,
    Sparkles,
    XCircle,
} from "lucide-react";

import { useQuiz } from "@/features/quiz/QuizContext";
import { useProgress } from "@/features/progress/ProgressContext";

/**
 * Phase 11 — Quiz results screen.
 *
 * Shown after the learner submits the quiz. Displays:
 *   - A pass/fail badge with the score and percentage.
 *   - XP earned (with a note if this was a retake and no new XP was granted).
 *   - A per-question review: the correct answer, the learner's selected
 *     answer, whether it was correct, and the explanation.
 *   - Follow-up actions: Retake, Return to Dashboard.
 *
 * On mount, this component triggers a progress refresh so the dashboard's XP
 * and quiz counters reflect the new attempt immediately.
 */
export default function QuizResults() {
    const { quiz, result, retake } = useQuiz();
    const { refreshProgress } = useProgress();
    const router = useRouter();

    if (!quiz || !result) return null;

    const passed = result.passed;
    const correct = result.score;
    const total = result.total_questions;
    const incorrect = total - correct;

    // Determine the badge tier for the score.
    const tier =
        result.percentage >= 80
            ? { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" }
            : result.percentage >= 50
                ? { label: "Good Effort", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" }
                : { label: "Keep Practising", color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-200" };

    return (
        <div className="space-y-6">
            {/* Score hero */}
            <section
                className={`relative overflow-hidden rounded-3xl p-6 shadow-sm ring-1 sm:p-8 ${tier.bg} ${tier.ring}`}
            >
                <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                    <div
                        className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ${tier.color}`}
                    >
                        {passed ? (
                            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
                        ) : (
                            <Award className="h-9 w-9" aria-hidden="true" />
                        )}
                    </div>

                    <div>
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider ${tier.color}`}
                        >
                            {passed ? "Passed" : "Did Not Pass"}
                        </span>
                        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                            {result.percentage}%
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {correct} of {total} correct · {tier.label}
                        </p>
                    </div>

                    {/* XP badge */}
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm">
                            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
                            <span className="text-sm font-bold text-slate-800">
                                {result.xp_earned > 0
                                    ? `+${result.xp_earned} XP`
                                    : result.xp_awarded
                                        ? "+0 XP"
                                        : "XP already earned"}
                            </span>
                        </div>
                    </div>
                    {!result.xp_awarded && (
                        <p className="text-xs font-medium text-slate-400">
                            XP is awarded once per quiz — retakes don't grant additional XP.
                        </p>
                    )}
                </div>

                {/* Decorative blob */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/40 blur-2xl"
                />
            </section>

            {/* Score breakdown */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Correct" value={correct} icon={CheckCircle2} accent="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Incorrect" value={incorrect} icon={XCircle} accent="text-rose-600" bg="bg-rose-50" />
                <StatCard label="Total" value={total} icon={Award} accent="text-blue-600" bg="bg-blue-50" />
            </div>

            {/* Per-question review */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-slate-700">Review & Explanations</h3>
                </div>
                <div className="space-y-4">
                    {result.review.map((item, i) => {
                        const isCorrect = item.is_correct;
                        return (
                            <div
                                key={item.id}
                                className={`rounded-2xl border-2 p-4 ${isCorrect
                                        ? "border-emerald-200 bg-emerald-50/50"
                                        : "border-rose-200 bg-rose-50/50"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${isCorrect ? "bg-emerald-500" : "bg-rose-500"
                                            }`}
                                    >
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-900">
                                            {item.question_text}
                                        </p>

                                        {/* Options with correct/selected markers */}
                                        <div className="mt-3 space-y-1.5">
                                            {item.options.map((option, optIdx) => {
                                                const isCorrectOption = optIdx === item.correct_answer_index;
                                                const isSelectedOption = item.selected_answer_index === optIdx;
                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isCorrectOption
                                                                ? "bg-emerald-100 font-semibold text-emerald-800"
                                                                : isSelectedOption
                                                                    ? "bg-rose-100 font-semibold text-rose-800"
                                                                    : "text-slate-600"
                                                            }`}
                                                    >
                                                        {isCorrectOption ? (
                                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                                                        ) : isSelectedOption ? (
                                                            <XCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                                                        ) : (
                                                            <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                                                        )}
                                                        <span>{option}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        {item.explanation && (
                                            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                                                <span className="font-bold text-slate-600">Explanation: </span>
                                                {item.explanation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Follow-up actions */}
            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => {
                        retake();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 active:scale-95"
                >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Retake Quiz
                </button>
                <button
                    type="button"
                    onClick={() => {
                        // Refresh progress so the dashboard reflects the new XP/quiz counters.
                        void refreshProgress();
                        router.push("/dashboard");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02] hover:bg-slate-800 active:scale-95"
                >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    accent,
    bg,
}: {
    label: string;
    value: number;
    icon: typeof CheckCircle2;
    accent: string;
    bg: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${accent}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
            <p className="text-xs font-medium text-slate-400">{label}</p>
        </div>
    );
}
