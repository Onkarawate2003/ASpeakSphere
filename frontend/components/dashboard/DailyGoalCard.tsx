"use client";

import { BookOpen, CheckCircle2, ClipboardCheck, Flame, MessageSquare } from "lucide-react";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { useProgress } from "@/features/progress/ProgressContext";

/**
 * Phase 10 — Live daily goal card.
 *
 * The daily goal (in minutes) still comes from the user's onboarding
 * preferences, but the completed minutes now come from the ProgressContext
 * (`total_practice_minutes`) so the progress bar reflects real practice.
 *
 * Phase 11 — Task-based goals. Below the minutes progress bar we render a
 * three-step learning-journey checklist (Lesson → Conversation → Assessment).
 * Each step lights up once the learner has at least one completion in that
 * category, giving a clear visual of the learning flow that culminates in
 * the lesson assessment quiz.
 */
export default function DailyGoalCard() {
    const { preferences } = useDashboard();
    const { progress } = useProgress();

    const dailyGoalMinutes = preferences?.daily_goal_minutes ?? 10;
    const completedMinutes = progress?.daily_practice_minutes ?? 0;
    const progressPercent = Math.min((completedMinutes / dailyGoalMinutes) * 100, 100);

    const completedLessons = progress?.daily_lessons ?? 0;
    const completedConversations = progress?.daily_conversations ?? 0;
    const completedQuizzes = progress?.daily_quizzes ?? 0;

    const tasks = [
        {
            icon: BookOpen,
            label: "Complete a Lesson",
            count: completedLessons,
            done: completedLessons > 0,
            accent: "text-blue-600 bg-blue-50",
        },
        {
            icon: MessageSquare,
            label: "Finish AI Conversation",
            count: completedConversations,
            done: completedConversations > 0,
            accent: "text-violet-600 bg-violet-50",
        },
        {
            icon: ClipboardCheck,
            label: "Complete Assessment",
            count: completedQuizzes,
            done: completedQuizzes > 0,
            accent: "text-emerald-600 bg-emerald-50",
        },
    ];

    const tasksDone = tasks.filter((t) => t.done).length;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-500">Daily goal</p>
                    <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-900">
                        {`${dailyGoalMinutes} minutes`}
                    </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Flame className="h-6 w-6" aria-hidden="true" />
                </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
                {`${completedMinutes} of ${dailyGoalMinutes} minutes completed today.`}
            </p>

            {/* Phase 11 — Learning-journey task checklist */}
            <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Learning journey
                    </p>
                    <span className="text-xs font-bold text-slate-500">
                        {`${tasksDone}/${tasks.length} steps`}
                    </span>
                </div>
                <ul className="mt-3 space-y-2">
                    {tasks.map(({ icon: Icon, label, count, done, accent }) => (
                        <li
                            key={label}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent}`}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="flex-1 text-sm font-semibold text-slate-700">
                                {label}
                            </span>
                            {done ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                    {count > 1 ? `${count} done` : "Done"}
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-slate-400">
                                    Not started
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
