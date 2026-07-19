"use client";

import { useEffect } from "react";
import { AlertCircle, BookOpen, Loader2 } from "lucide-react";

import { useQuiz } from "@/features/quiz/QuizContext";
import { useProgress } from "@/features/progress/ProgressContext";
import QuizProgress from "./QuizProgress";
import QuizQuestionCard from "./QuizQuestionCard";
import QuizNavigation from "./QuizNavigation";
import QuizResults from "./QuizResults";

/**
 * Phase 11 — Quiz container.
 *
 * Orchestrates the quiz lifecycle phases:
 *   loading   → spinner
 *   error     → error state (e.g. no quiz for this lesson)
 *   taking    → progress + question card + navigation
 *   submitting→ question card (frozen) + submitting spinner
 *   results   → results screen
 *
 * The parent page passes the `lessonId` and the lesson title (resolved from
 * the static catalog) so the header can show context. The container triggers
 * the quiz fetch on mount and a progress refresh when results appear.
 */
export default function QuizContainer({
    lessonId,
    lessonTitle,
}: {
    lessonId: string;
    lessonTitle: string | null;
}) {
    const { phase, error, isLoading, loadQuiz, result } = useQuiz();
    const { refreshProgress } = useProgress();

    // Fetch the quiz on mount (and when the lesson changes).
    useEffect(() => {
        void loadQuiz(lessonId);
    }, [lessonId, loadQuiz]);

    // When results appear, refresh the global progress so the dashboard's
    // XP and quiz counters reflect the new attempt immediately.
    useEffect(() => {
        if (phase === "results" && result?.xp_awarded) {
            void refreshProgress();
        }
    }, [phase, result, refreshProgress]);

    if (isLoading || phase === "loading") {
        return (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-500">Loading your assessment…</p>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
                    <AlertCircle className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                        Assessment unavailable
                    </h2>
                    <p className="max-w-md text-sm leading-relaxed text-slate-500">
                        {error ?? "No quiz is available for this lesson yet."}
                    </p>
                </div>
            </div>
        );
    }

    if (phase === "results") {
        return <QuizResults />;
    }

    // taking / submitting
    return (
        <div className="space-y-5">
            {/* Lesson context header */}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm">
                <BookOpen className="h-4 w-4 text-blue-300" aria-hidden="true" />
                <span className="text-sm font-bold">
                    {lessonTitle ?? "Lesson Assessment"}
                </span>
            </div>

            <QuizProgress />
            <QuizQuestionCard />
            <QuizNavigation />
        </div>
    );
}
