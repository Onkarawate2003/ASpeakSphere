"use client";

import { memo } from "react";

import { useStats } from "@/features/stats/StatsContext";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import EmptyState from "@/components/dashboard/EmptyState";

/**
 * Weekly & Monthly Progress summary — Module M12 (Statistics Dashboard).
 *
 * A tile grid built from `overview` (the range-scoped totals endpoint).
 * "Weekly" and "Monthly" are not separate features — they're this same
 * component re-rendered under the shared `range` filter (7d / 30d), so
 * there's no duplicate endpoint or component for each.
 */
function WeeklyMonthlySummaryInner() {
    const { overview, isLoading, error } = useStats();

    if (isLoading) return <LoadingSkeleton rows={2} />;
    if (error) {
        return <EmptyState title="Couldn't load your summary" description={error} />;
    }
    if (!overview) {
        return (
            <EmptyState
                title="No learning activity available yet"
                description="Complete AI conversations to generate your analysis."
            />
        );
    }

    const tiles = [
        { label: "XP earned", value: overview.xp_earned },
        { label: "Conversations", value: overview.conversations_completed },
        { label: "Lessons completed", value: overview.lessons_completed },
        { label: "Quizzes completed", value: overview.quizzes_completed },
        { label: "Practice minutes", value: overview.practice_minutes },
        { label: "Active days", value: overview.active_days },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {tiles.map(({ label, value }) => (
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
    );
}

WeeklyMonthlySummaryInner.displayName = "WeeklyMonthlySummaryInner";

const WeeklyMonthlySummary = memo(WeeklyMonthlySummaryInner);
export default WeeklyMonthlySummary;
