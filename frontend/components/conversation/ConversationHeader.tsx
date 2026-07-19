"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Gauge, X, BookOpen } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { calculateProgress, formatTimer } from "@/features/conversation/utils";
import { TUTOR_NAME } from "@/features/conversation/constants";
import type { Difficulty } from "@/features/conversation/types";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
    Beginner: "bg-emerald-100 text-emerald-700",
    Intermediate: "bg-amber-100 text-amber-700",
    Advanced: "bg-rose-100 text-rose-700",
};

/**
 * Conversation header bar (Phase M14 Enhancement).
 *
 * Premium top header for the redesigned Conversation screen. Surfaces the
 * lesson context and live session metrics so the learner always knows where
 * they are in the lesson and how long they've been practising:
 *
 *  - **Lesson title** (when a lesson is selected) or the practice-mode label
 *    (free-form sessions) — the primary heading.
 *  - **Lesson progress bar** — a slim, animated bar driven by
 *    `calculateProgress(messageCount, isCompleted)` (the same mapping used by
 *    `ConversationProgress`), so the header and sidebar stay in sync.
 *  - **Current lesson indicator** — a "Lesson" chip with a book icon when a
 *    lesson is active.
 *  - **Session timer** (MM:SS) — unchanged from before.
 *  - **Exit button** — a clear "Exit" affordance (the existing back link is
 *    retained for backward compatibility; the exit button is an additional,
 *    more prominent affordance).
 *  - **Difficulty badge** — unchanged.
 *
 * Backward compatibility:
 *  - The back link, tutor identity, practice label, timer, and difficulty
 *    badge all remain, so any external deep-links or muscle memory still
 *    work.
 *  - When no lesson is selected (free-form session), the lesson-specific
 *    elements gracefully hide and the header falls back to the original
 *    practice-label layout.
 */
export default function ConversationHeader() {
    const {
        practiceLabel,
        difficulty,
        elapsedSeconds,
        status,
        lessonTitle,
        messages,
        isCompleted,
    } = useConversation();

    const progress = calculateProgress(messages.length, isCompleted);
    const hasLesson = Boolean(lessonTitle);
    const isActive = status === "active";

    return (
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">
                {/* Back link (retained for backward compatibility) */}
                <Link
                    href="/dashboard/practice"
                    className="inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Practice</span>
                    <span className="sm:hidden">Back</span>
                </Link>

                {/* Center — lesson title / practice label + progress bar */}
                <div className="min-w-0 flex-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                        {/* Current lesson chip (when a lesson is active) */}
                        {hasLesson && (
                            <span className="hidden items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 sm:inline-flex">
                                <BookOpen className="h-3 w-3" aria-hidden="true" />
                                Lesson
                            </span>
                        )}
                        <span className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                            {lessonTitle ?? TUTOR_NAME}
                        </span>
                        <span className="hidden text-slate-300 sm:inline">•</span>
                        <span className="hidden items-center gap-1 text-xs font-semibold text-emerald-600 sm:inline-flex">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Online
                        </span>
                    </div>
                    <p className="truncate text-xs font-medium text-slate-400">
                        {practiceLabel}
                    </p>

                    {/* Lesson progress bar — slim, animated, syncs with sidebar. */}
                    <div className="mx-auto mt-2 hidden h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 sm:block">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                            role="progressbar"
                            aria-label="Lesson progress"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        />
                    </div>
                </div>

                {/* Right — timer + difficulty + exit */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div
                        className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-bold tabular-nums ${isActive
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                            }`}
                        aria-label="Session timer"
                    >
                        <Clock className="h-4 w-4" />
                        {formatTimer(elapsedSeconds)}
                    </div>
                    <span
                        className={`hidden items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold sm:inline-flex ${DIFFICULTY_STYLES[difficulty]}`}
                    >
                        <Gauge className="h-3.5 w-3.5" />
                        {difficulty}
                    </span>
                    {/* Exit button — prominent affordance to leave the session. */}
                    <Link
                        href="/dashboard/practice"
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 active:scale-95"
                        aria-label="Exit conversation"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Exit</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
