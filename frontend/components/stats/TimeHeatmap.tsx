"use client";

import { memo } from "react";

import { useStats } from "@/features/stats/StatsContext";
import { formatChartDate } from "@/features/stats/utils";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";

/** Practice-minutes → Tailwind blue shade, GitHub-contribution-graph style. */
function intensityClass(minutes: number): string {
    if (minutes <= 0) return "bg-slate-100";
    if (minutes < 10) return "bg-blue-200";
    if (minutes < 20) return "bg-blue-400";
    if (minutes < 40) return "bg-blue-600";
    return "bg-blue-800";
}

/**
 * Time-Based Learning Analytics heatmap — Module M12 (Statistics Dashboard).
 *
 * A simple CSS-grid calendar heatmap (no chart-library dependency needed)
 * shaded by `dailyActivity[].practice_minutes` for the selected range.
 * Reads from the shared `StatsContext`, `memo`-ized.
 */
function TimeHeatmapInner() {
    const { dailyActivity, isLoading, error } = useStats();

    if (isLoading) return <LoadingSkeleton rows={1} />;
    if (error) {
        return <EmptyState title="Couldn't load your activity heatmap" description={error} />;
    }
    if (dailyActivity.length === 0) {
        return (
            <EmptyState
                title="No activity in this period"
                description="Complete AI conversations to generate your analysis."
            />
        );
    }

    return (
        <div>
            <div
                className="grid grid-cols-[repeat(auto-fill,minmax(14px,1fr))] gap-1.5"
                role="img"
                aria-label="Daily practice time heatmap"
            >
                {dailyActivity.map((day) => (
                    <div
                        key={day.date}
                        title={`${formatChartDate(day.date)}: ${day.practice_minutes} min practice, ${day.conversation_count} session(s)`}
                        className={`aspect-square rounded-sm ${intensityClass(day.practice_minutes)}`}
                    />
                ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-slate-400">
                <span>Less</span>
                <span className="h-3 w-3 rounded-sm bg-slate-100" />
                <span className="h-3 w-3 rounded-sm bg-blue-200" />
                <span className="h-3 w-3 rounded-sm bg-blue-400" />
                <span className="h-3 w-3 rounded-sm bg-blue-600" />
                <span className="h-3 w-3 rounded-sm bg-blue-800" />
                <span>More</span>
            </div>
        </div>
    );
}

TimeHeatmapInner.displayName = "TimeHeatmapInner";

const TimeHeatmap = memo(TimeHeatmapInner);
export default TimeHeatmap;
