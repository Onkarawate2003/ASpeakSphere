"use client";

import { TrendingUp } from "lucide-react";
import { useProgress } from "@/features/progress/ProgressContext";

/**
 * Phase 10 — Live XP & Level progress card.
 *
 * Replaces the previous static "Skill breakdown" empty state with the
 * learner's current level, total XP, and a progress bar showing how close
 * they are to the next level. All values come from the ProgressContext
 * (fetched after login, refreshed after each conversation/lesson completion).
 *
 * When progress is still loading (or failed to load), zeroed fallbacks are
 * shown so the card never breaks the dashboard layout.
 */
export default function ProgressCard() {
    const { progress } = useProgress();

    const totalXp = progress?.total_xp ?? 0;
    const currentLevel = progress?.current_level ?? 1;
    const xpIntoLevel = progress?.xp_into_level ?? 0;
    const xpForNextLevel = progress?.xp_for_next_level ?? 100;
    const progressPercent = Math.min(progress?.level_progress_percent ?? 0, 100);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-500">Progress</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-900">
                        {`Level ${currentLevel}`}
                    </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-6 w-6" aria-hidden="true" />
                </div>
            </div>

            <div className="mt-5">
                <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-slate-500">
                        {`${xpIntoLevel} / ${xpForNextLevel} XP`}
                    </p>
                    <p className="text-sm font-bold text-emerald-600">
                        {`${Math.round(progressPercent)}%`}
                    </p>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-500">
                    {`${totalXp.toLocaleString()} total XP · ${xpForNextLevel - xpIntoLevel} XP to Level ${currentLevel + 1}`}
                </p>
            </div>
        </section>
    );
}
