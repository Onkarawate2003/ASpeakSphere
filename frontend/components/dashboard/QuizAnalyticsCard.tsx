"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { getQuizHistory, getQuizStats } from "@/features/quiz/api";
import type {
    QuizAttemptSummaryDTO,
    QuizStatsResponseDTO,
} from "@/features/quiz/types";
import { formatHistoryDate } from "@/components/history/historyUtils";
import { useOptionalStats } from "@/features/stats/StatsContext";
import type { StatsRangeKey } from "@/features/stats/types";
import { formatChartDate, isWithinRange } from "@/features/stats/utils";
import EmptyState from "./EmptyState";

/**
 * Phase 11 — Quiz analytics card for the Statistics page.
 *
 * Fetches the learner's aggregate quiz stats (`GET /api/v1/quizzes/stats`)
 * and recent attempt history (`GET /api/v1/quizzes/history`) and renders:
 *  - A 4-tile analytics grid (attempts, completed, average, best score).
 *  - A compact list of the five most recent quiz attempts with score badges.
 *
 * This powers PART 8 (Statistics integration) and PART 9 (History
 * integration) of the Assessment module.
 */
export default function QuizAnalyticsCard() {
    const [stats, setStats] = useState<QuizStatsResponseDTO | null>(null);
    const [history, setHistory] = useState<QuizAttemptSummaryDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Module M12 — when rendered inside the Statistics Dashboard, the trend
    // line below respects the shared date-range filter. Outside a
    // StatsProvider this is null and the trend line simply doesn't render.
    const sharedStats = useOptionalStats();

    const loadAnalytics = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [statsData, historyData] = await Promise.all([
                getQuizStats(),
                getQuizHistory(),
            ]);
            setStats(statsData);
            setHistory(historyData.slice(0, 5));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "We couldn't load your quiz analytics.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    const recentAttempts = history.slice(0, 5);

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Quiz analytics"
        >
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-500">
                        Assessment analytics
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-900">
                        Quiz performance
                    </h2>
                </div>
                <ClipboardCheck className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            </div>

            {isLoading ? (
                <div className="space-y-3" aria-label="Loading quiz analytics">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-24 animate-pulse rounded-2xl bg-slate-100"
                            />
                        ))}
                    </div>
                    <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            ) : error ? (
                <EmptyState
                    title="Couldn't load analytics"
                    description={error}
                />
            ) : stats && stats.total_attempts === 0 ? (
                <EmptyState
                    title="No quiz attempts yet"
                    description="Complete a lesson assessment to see your quiz analytics here."
                    actionLabel="Browse lessons"
                    actionHref="/dashboard/lessons"
                />
            ) : stats ? (
                <>
                    {/* Analytics tiles */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <AnalyticsTile
                            icon={ClipboardCheck}
                            label="Attempts"
                            value={stats.total_attempts.toString()}
                            accent="text-blue-600 bg-blue-50"
                        />
                        <AnalyticsTile
                            icon={Award}
                            label="Completed"
                            value={stats.completed_quizzes.toString()}
                            accent="text-emerald-600 bg-emerald-50"
                        />
                        <AnalyticsTile
                            icon={TrendingUp}
                            label="Avg score"
                            value={`${stats.average_score}%`}
                            accent="text-violet-600 bg-violet-50"
                        />
                        <AnalyticsTile
                            icon={Target}
                            label="Best score"
                            value={`${stats.highest_score}%`}
                            accent="text-amber-600 bg-amber-50"
                        />
                    </div>

                    {/* Module M12 — quiz score trend line, filtered by the shared
                        Statistics Dashboard range when present (no-op outside it). */}
                    {sharedStats && (
                        <QuizTrendLine history={history} range={sharedStats.range} />
                    )}

                    {/* XP summary */}
                    {stats.total_xp_from_quizzes > 0 && (
                        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                            <Award className="h-5 w-5 text-amber-600" aria-hidden="true" />
                            <p className="text-sm font-semibold text-amber-800">
                                {`${stats.total_xp_from_quizzes} XP earned from assessments`}
                            </p>
                        </div>
                    )}

                    {/* Recent attempts list */}
                    {recentAttempts.length > 0 && (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Recent attempts
                                </p>
                            </div>
                            <ul className="space-y-2">
                                {recentAttempts.map((attempt) => (
                                    <li
                                        key={attempt.id}
                                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                                    >
                                        <span
                                            className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${attempt.percentage >= 80
                                                ? "bg-emerald-50 text-emerald-700"
                                                : attempt.percentage >= 50
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-rose-50 text-rose-700"
                                                }`}
                                        >
                                            {`${attempt.percentage}%`}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-700">
                                                {attempt.quiz_title}
                                            </p>
                                            <p className="text-xs font-medium text-slate-400">
                                                {formatHistoryDate(attempt.completed_at)}
                                            </p>
                                        </div>
                                        {attempt.xp_earned > 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                                                <Award className="h-3 w-3" aria-hidden="true" />
                                                {`+${attempt.xp_earned}`}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            ) : null}
        </section>
    );
}

/**
 * Module M12 — quiz score trend line.
 *
 * Filters the already-fetched `history` (newest-first) by the shared
 * Statistics Dashboard range and plots `percentage` over time. Extends the
 * existing card rather than duplicating a separate "Quiz Performance chart"
 * component — no new endpoint, no new fetch.
 */
function QuizTrendLine({
    history,
    range,
}: {
    history: QuizAttemptSummaryDTO[];
    range: StatsRangeKey;
}) {
    const points = history
        .filter((attempt) => isWithinRange(attempt.completed_at, range))
        .slice()
        .reverse() // history is newest-first; charts read left-to-right oldest-first
        .map((attempt) => ({
            date: formatChartDate(attempt.completed_at.slice(0, 10)),
            percentage: attempt.percentage,
        }));

    if (points.length < 2) {
        // Not enough data in this range to draw a meaningful trend.
        return null;
    }

    return (
        <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Score trend
            </p>
            <div className="h-40" aria-label="Quiz score trend over time">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            width={32}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #e2e8f0",
                                fontSize: 12,
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

type AnalyticsTileProps = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    accent: string;
};

function AnalyticsTile({ icon: Icon, label, value, accent }: AnalyticsTileProps) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}
            >
                <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-3 text-2xl font-bold tracking-[-0.03em] text-slate-900">
                {value}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        </div>
    );
}
