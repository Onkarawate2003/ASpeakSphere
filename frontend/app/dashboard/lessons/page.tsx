"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";

import { DashboardLayout } from "../../../components/dashboard";
import { practiceCategories } from "../../../components/dashboard/mockData";
import { PRACTICE_LABELS } from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";
import {
    getLessonsForPractice,
    getLessonById,
} from "@/features/conversation/lessonsData";
import LessonCard from "@/components/conversation/LessonCard";

const VALID_PRACTICE_TYPES = new Set(
    practiceCategories.map((c) => c.practiceType),
);

/**
 * Phase 9 — Lesson Selection page.
 *
 * Flow: Practice Mode → Lesson Selection → Conversation.
 *
 * Reads the `practice` search param to determine which practice mode the
 * learner chose, then shows the lessons available for that mode. The learner
 * selects a lesson and clicks "Start Lesson" to navigate to the conversation
 * page with the lesson encoded as URL search params:
 *   `/dashboard/conversation?practice=<type>&lesson=<lessonId>`
 *
 * The conversation page resolves the lesson id back to its title + objectives
 * via the shared catalog (`getLessonById`) so Emma can teach that lesson.
 */
export default function LessonsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const practice = searchParams.get("practice");
    const isValid =
        practice !== null && VALID_PRACTICE_TYPES.has(practice);
    const practiceType = isValid ? (practice as PracticeType) : null;

    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
        null,
    );

    const lessons = useMemo(
        () => (practiceType ? getLessonsForPractice(practiceType) : []),
        [practiceType],
    );

    const practiceLabel = practiceType ? PRACTICE_LABELS[practiceType] : "Practice";

    const handleStart = (lessonId: string) => {
        if (!practiceType) return;
        const params = new URLSearchParams({
            practice: practiceType,
            lesson: lessonId,
        });
        router.push(`/dashboard/conversation?${params.toString()}`);
    };

    if (!isValid) {
        return (
            <DashboardLayout>
                <div className="px-4 py-6 sm:px-6 lg:px-8">
                    <InvalidPracticeState />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                {/* Back link */}
                <Link
                    href="/dashboard/practice"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to Practice
                </Link>

                {/* Hero header */}
                <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-200">
                            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                            {practiceLabel}
                        </span>
                        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Choose a lesson to practise
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                            Pick a structured lesson and Emma will guide you
                            through it step by step — explaining concepts, asking
                            practice questions, and keeping you focused on the
                            topic.
                        </p>
                    </div>
                    {/* Decorative gradient blob */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl"
                    />
                </section>

                {/* Lessons grid */}
                {lessons.length > 0 ? (
                    <section className="mt-6">
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {lessons.map((lesson) => (
                                <LessonCard
                                    key={lesson.id}
                                    lesson={lesson}
                                    isSelected={selectedLessonId === lesson.id}
                                    onSelect={() => setSelectedLessonId(lesson.id)}
                                    onStart={() => handleStart(lesson.id)}
                                />
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-sm font-semibold text-slate-500">
                            No lessons are available for this practice mode yet.
                        </p>
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
}

/**
 * Fallback shown when the `practice` search param is missing or invalid.
 * Mirrors the conversation page's InvalidPracticeState for consistency.
 */
function InvalidPracticeState() {
    return (
        <section className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
                <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    No practice mode selected
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    Choose a practice mode from the Practice page to see the
                    lessons available for it.
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
