"use client";

import { memo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { useStats } from "@/features/stats/StatsContext";
import { formatChartDate } from "@/features/stats/utils";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";

/**
 * XP Progress chart — Module M12 (Statistics Dashboard).
 *
 * Renders `dailyActivity[].xp_earned` as an area chart over the selected
 * date range. Reads from the shared `StatsContext` (one fetch per filter
 * change, not one per chart) and is `memo`-ized so it only re-renders when
 * the stats data actually changes.
 */
function XpProgressChartInner() {
    const { dailyActivity, isLoading, error } = useStats();

    if (isLoading) return <LoadingSkeleton rows={1} />;
    if (error) {
        return <EmptyState title="Couldn't load XP progress" description={error} />;
    }
    if (dailyActivity.length === 0 || dailyActivity.every((d) => d.xp_earned === 0)) {
        return (
            <EmptyState
                title="No XP earned yet"
                description="Complete AI conversations, lessons, or quizzes to start earning XP."
            />
        );
    }

    const data = dailyActivity.map((d) => ({
        date: formatChartDate(d.date),
        xp: d.xp_earned,
    }));

    return (
        <div className="h-64" aria-label="XP earned over time">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                        <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 12,
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="xp"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="url(#xpGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

XpProgressChartInner.displayName = "XpProgressChartInner";

const XpProgressChart = memo(XpProgressChartInner);
export default XpProgressChart;
