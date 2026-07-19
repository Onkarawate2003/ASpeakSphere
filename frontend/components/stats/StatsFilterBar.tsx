"use client";

import { useStats } from "@/features/stats/StatsContext";
import { STATS_RANGE_OPTIONS } from "@/features/stats/types";

/**
 * Statistics date-range filter bar — Module M12 (Statistics Dashboard).
 *
 * Today / 7d / 30d / 90d / This Year / All Time pills that drive the shared
 * `StatsContext.range`, so every chart on the page updates together.
 * Reuses the exact pill-button classes from `ConversationHistoryFilters`.
 */
export default function StatsFilterBar() {
    const { range, setRange } = useStats();

    return (
        <section
            className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            aria-label="Statistics date range filter"
            role="group"
        >
            {STATS_RANGE_OPTIONS.map((option) => {
                const isActive = range === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setRange(option.value)}
                        aria-pressed={isActive}
                        aria-label={`Show statistics for ${option.label}`}
                        className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isActive
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </section>
    );
}
