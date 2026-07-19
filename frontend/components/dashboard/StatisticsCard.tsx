"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useProgress } from "@/features/progress/ProgressContext";

/**
 * Phase 10 — Live statistics card.
 *
 * Shows the learner's completed lessons, completed conversations, total
 * practice minutes, current streak, and Phase 11 quiz assessment stats
 * (assessments completed + average score). All values come from the
 * ProgressContext so they update automatically after each completion.
 */
export default function StatisticsCard() {
    const { progress } = useProgress();

    const completedLessons = progress?.completed_lessons ?? 0;
    const completedConversations = progress?.completed_conversations ?? 0;
    const practiceMinutes = progress?.total_practice_minutes ?? 0;
    const currentStreak = progress?.current_streak ?? 0;
    const completedQuizzes = progress?.completed_quizzes ?? 0;
    const averageQuizScore = progress?.average_quiz_score ?? 0;

    const stats = [
        { label: "Lessons", value: completedLessons },
        { label: "Conversations", value: completedConversations },
        { label: "Practice min", value: practiceMinutes },
        { label: "Day streak", value: currentStreak },
        { label: "Assessments", value: completedQuizzes },
        { label: "Avg score", value: `${averageQuizScore}%` },
    ];

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-slate-500">Statistics</p>
                <Link href="/dashboard/stats" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600">
                    View details
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
                {stats.map(({ label, value }) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                    >
                        <p className="text-2xl font-bold tracking-[-0.03em] text-slate-900">
                            {value.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
