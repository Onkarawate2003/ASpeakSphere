"use client";

import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useStats } from "@/features/stats/StatsContext";
import { practiceTypeColor, practiceTypeLabel } from "@/features/stats/utils";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";

/**
 * Practice Category Distribution chart — Module M12 (Statistics Dashboard).
 *
 * Renders `categoryDistribution` (session count per practice_type) as a
 * donut chart, with a color-coded legend below. Reads from the shared
 * `StatsContext`, `memo`-ized.
 */
function CategoryDistributionChartInner() {
    const { categoryDistribution, isLoading, error } = useStats();

    if (isLoading) return <LoadingSkeleton rows={1} />;
    if (error) {
        return <EmptyState title="Couldn't load category distribution" description={error} />;
    }
    if (categoryDistribution.length === 0) {
        return (
            <EmptyState
                title="No practice sessions yet"
                description="Complete AI conversations across different practice modes to see your category breakdown."
            />
        );
    }

    const data = categoryDistribution.map((item) => ({
        name: practiceTypeLabel(item.practice_type),
        value: item.session_count,
        color: practiceTypeColor(item.practice_type),
    }));

    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
            <div className="h-56 w-56" aria-label="Practice category distribution">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                        >
                            {data.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #e2e8f0",
                                fontSize: 12,
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className="grid grid-cols-1 gap-2">
                {data.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-2 text-sm">
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                            aria-hidden="true"
                        />
                        <span className="font-semibold text-slate-700">{entry.name}</span>
                        <span className="text-slate-400">{entry.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

CategoryDistributionChartInner.displayName = "CategoryDistributionChartInner";

const CategoryDistributionChart = memo(CategoryDistributionChartInner);
export default CategoryDistributionChart;
