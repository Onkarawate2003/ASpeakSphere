"use client";

import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { DashboardLayout } from "../../../components/dashboard";
import { getLessonById } from "@/features/conversation/lessonsData";
import { QuizProvider } from "@/features/quiz/QuizContext";
import QuizContainer from "@/components/quiz/QuizContainer";

/**
 * Phase 11 — Lesson Assessment (Quiz) page.
 *
 * Flow: Lesson → AI Conversation Practice → Lesson Assessment (Quiz) → XP.
 *
 * Reads the `lesson` search param (a stable catalog id) and renders the quiz
 * for that lesson. The lesson title is resolved from the static catalog so
 * the header shows context. The quiz content itself comes from the backend
 * (`GET /api/v1/quizzes/lesson/{lessonId}`).
 *
 * If the `lesson` param is missing or unknown, an invalid-state fallback is
 * shown (mirrors the conversation / lessons pages).
 */
export default function QuizPage() {
    const searchParams = useSearchParams();
    const lessonId = searchParams.get("lesson");
    const lesson = lessonId ? getLessonById(lessonId) : undefined;
    const isValid = Boolean(lessonId && lesson);

    return (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to Dashboard
                </Link>

                {/* Hero header */}
                <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-200">
                            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Lesson Assessment
                        </span>
                        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {isValid ? lesson!.title : "Quiz"}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                            Test what you learned. Answer the questions, submit, and earn XP
                            based on your score. You can retake the quiz anytime — XP is
                            awarded once per quiz.
                        </p>
                    </div>
                    {/* Decorative gradient blob */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl"
                    />
                </section>

                {/* Quiz body */}
                <div className="mt-6">
                    {isValid ? (
                        <QuizProvider>
                            <QuizContainer
                                lessonId={lesson!.id}
                                lessonTitle={lesson!.title}
                            />
                        </QuizProvider>
                    ) : (
                        <InvalidLessonState />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

/**
 * Fallback shown when the `lesson` search param is missing or unknown.
 */
function InvalidLessonState() {
    return (
        <section className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
                <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    No lesson selected
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    Choose a lesson from the Lessons page to take its assessment.
                </p>
            </div>
            <Link
                href="/dashboard/practice"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Practice
            </Link>
        </section>
    );
}
