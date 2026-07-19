"use client";

import { memo } from "react";
import {
    Bar,
    BarChart,
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
 * Conversation Sessions chart — Module M12 (Statistics Dashboard).
 *
 * Renders `dailyActivity[].conversation_count` as a bar chart over the
 * selected date range. Reads from the shared `StatsContext`, `memo`-ized.
 */
function ConversationSessionsChartInner() {
    const { dailyActivity, isLoading, error } = useStats();

    if (isLoading) return <LoadingSkeleton rows={1} />;
    if (error) {
        return <EmptyState title="Couldn't load session activity" description={error} />;
    }
    if (dailyActivity.length === 0 || dailyActivity.every((d) => d.conversation_count === 0)) {
        return (
            <EmptyState
                title="No conversation sessions yet"
                description="Complete AI conversations to generate your analysis."
            />
        );
    }

    const data = dailyActivity.map((d) => ({
        date: formatChartDate(d.date),
        sessions: d.conversation_count,
    }));

    return (
        <div className="h-64" aria-label="Conversation sessions over time">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                    <Bar dataKey="sessions" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

ConversationSessionsChartInner.displayName = "ConversationSessionsChartInner";

const ConversationSessionsChart = memo(ConversationSessionsChartInner);
export default ConversationSessionsChart;
