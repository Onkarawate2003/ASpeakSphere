"use client";

import { useQuiz } from "@/features/quiz/QuizContext";

/**
 * Phase 11 — Quiz progress indicator.
 *
 * Shows the current question number, a progress bar, and a row of clickable
 * question dots so the learner can jump between questions. Answered questions
 * are highlighted so the learner can see their progress at a glance.
 */
export default function QuizProgress() {
    const { quiz, currentIndex, answeredCount, goToQuestion, answers } = useQuiz();

    if (!quiz) return null;

    const total = quiz.questions.length;
    const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-500">
                        Question {currentIndex + 1} of {total}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                        {answeredCount} of {total} answered
                    </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {percent}%
                </span>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                />
            </div>

            {/* Question dots — clickable to jump between questions. */}
            <div className="mt-4 flex flex-wrap gap-2">
                {quiz.questions.map((q, i) => {
                    const isAnswered = answers[i] !== null;
                    const isCurrent = i === currentIndex;
                    return (
                        <button
                            key={q.id}
                            type="button"
                            onClick={() => goToQuestion(i)}
                            aria-label={`Go to question ${i + 1}`}
                            aria-current={isCurrent ? "true" : undefined}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${isCurrent
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : isAnswered
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
