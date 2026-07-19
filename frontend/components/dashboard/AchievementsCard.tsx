"use client";

import { Flame, Trophy } from "lucide-react";

import { useProgress } from "@/features/progress/ProgressContext";

/**
 * Phase 10 — Achievements card.
 *
 * Full achievements/badges are a future module (Phase 11+, see PART 9), but
 * the streak and level milestones are available now from the ProgressContext.
 * We surface those as earned milestones so the card is no longer an empty
 * state once the learner has practised. The generic XP award endpoint
 * (`POST /api/v1/progress/award`) lets future modules add badges here without
 * touching the existing progress logic.
 */
export default function AchievementsCard() {
    const { progress } = useProgress();

    const currentStreak = progress?.current_streak ?? 0;
    const currentLevel = progress?.current_level ?? 1;

    const milestones = [
        {
            icon: Flame,
            title: `${currentStreak}-day streak`,
            description:
                currentStreak > 0
                    ? "Keep practising daily to grow your streak."
                    : "Complete a session today to start a streak.",
            earned: currentStreak > 0,
            accent: "bg-orange-50 text-orange-600",
        },
        {
            icon: Trophy,
            title: `Reached Level ${currentLevel}`,
            description:
                currentLevel > 1
                    ? "Earn more XP to unlock the next level."
                    : "Complete a lesson or conversation to level up.",
            earned: currentLevel > 1,
            accent: "bg-amber-50 text-amber-600",
        },
    ];

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Achievements</p>
            <div className="mt-5 space-y-3">
                {milestones.map(({ icon: Icon, title, description, earned, accent }) => (
                    <div
                        key={title}
                        className={`flex items-start gap-3 rounded-2xl border p-4 transition ${earned
                                ? "border-slate-200 bg-white"
                                : "border-dashed border-slate-200 bg-slate-50/60 opacity-70"
                            }`}
                    >
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{title}</p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                {description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
