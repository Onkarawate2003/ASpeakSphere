"use client";

import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";

import { useQuiz } from "@/features/quiz/QuizContext";

/**
 * Phase 11 — Quiz navigation controls.
 *
 * Renders Previous / Next buttons while taking the quiz, and a Submit button
 * on the last question. Submit is disabled until at least one answer is
 * selected (the learner can still submit with skipped questions — they're
 * graded as incorrect). Shows a spinner while submitting.
 */
export default function QuizNavigation() {
    const {
        quiz,
        currentIndex,
        nextQuestion,
        prevQuestion,
        submit,
        isSubmitting,
        answeredCount,
    } = useQuiz();

    if (!quiz) return null;

    const total = quiz.questions.length;
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === total - 1;
    const canSubmit = answeredCount > 0 && !isSubmitting;

    return (
        <div className="flex items-center justify-between gap-3">
            <button
                type="button"
                onClick={prevQuestion}
                disabled={isFirst}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Previous
            </button>

            {isLast ? (
                <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Submitting…
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            Submit Quiz
                        </>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={nextQuestion}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02] hover:bg-slate-800 active:scale-95"
                >
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
