"use client";

import { ArrowRight, Clock, Target } from "lucide-react";
import type { Lesson } from "@/features/conversation/lessonsData";

type LessonCardProps = {
    /** The lesson to render. */
    lesson: Lesson;
    /** Whether this card is currently selected (highlighted). */
    isSelected?: boolean;
    /** Click handler — selects the lesson on the parent page. */
    onSelect?: () => void;
    /** Start handler — launches the conversation for this lesson. */
    onStart?: () => void;
};

/**
 * Difficulty badge colour mapping. Reuses the same visual language as the
 * practice-mode difficulty badges so the UI stays consistent.
 */
const DIFFICULTY_TONE: Record<string, string> = {
    Beginner: "bg-emerald-50 text-emerald-600",
    Intermediate: "bg-amber-50 text-amber-600",
    Advanced: "bg-rose-50 text-rose-600",
};

/**
 * Phase 9 — Lesson card.
 *
 * Displays a single lesson from the catalog: title, description, difficulty,
 * estimated duration, objectives, and a "Start Lesson" button. Used by the
 * Lesson Selection page. Clicking the card selects it; the Start button
 * launches the conversation with this lesson.
 *
 * Fully responsive: single column on mobile, the grid on the lessons page
 * lays cards out 1/2/3 columns at the sm/lg breakpoints.
 */
export default function LessonCard({
    lesson,
    isSelected = false,
    onSelect,
    onStart,
}: LessonCardProps) {
    const tone = DIFFICULTY_TONE[lesson.difficulty] ?? DIFFICULTY_TONE.Beginner;

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.();
                }
            }}
            aria-pressed={isSelected}
            className={`group flex h-full cursor-pointer flex-col rounded-3xl border bg-white p-5 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : "border-slate-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                }`}
        >
            {/* Header: title + difficulty badge */}
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {lesson.title}
                </h3>
                <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] ${tone}`}
                >
                    {lesson.difficulty}
                </span>
            </div>

            {/* Description */}
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {lesson.description}
            </p>

            {/* Meta: estimated duration */}
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lesson.durationMin} min</span>
            </div>

            {/* Objectives */}
            <div className="mt-4 flex-1">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    What you'll practise
                </p>
                <ul className="mt-2 space-y-1.5">
                    {lesson.objectives.map((objective, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"
                        >
                            <span
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"
                                aria-hidden="true"
                            />
                            {objective}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Start Lesson button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onStart?.();
                }}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
            >
                Start Lesson
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
        </article>
    );
}
