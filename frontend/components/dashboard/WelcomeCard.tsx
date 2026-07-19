"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { learningGoalLabels } from "@/features/dashboard/dashboardMappings";
import { useProgress } from "@/features/progress/ProgressContext";

export default function WelcomeCard() {
    const { user } = useAuth();
    const { preferences } = useDashboard();
    const { progress } = useProgress();

    // Priority: display_name set by user in Settings → signup first_name
    const firstName = preferences?.display_name?.trim() || user?.first_name || "Learner";

    const goalLabel = preferences?.learning_goal ? (learningGoalLabels[preferences.learning_goal] || preferences.learning_goal) : "Daily speaking";
    const dailyGoalMinutes = preferences?.daily_goal_minutes ?? 10;

    return (
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" aria-hidden="true" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
                <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        Personalized dashboard
                    </div>
                    <div className="space-y-3">
                        <h1 className="max-w-2xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{firstName ? `Welcome, ${firstName}.` : "Welcome to your speaking command center."}</h1>
                        <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Your onboarding choices now power daily goals, practice prompts, and future AI conversation modules.</p>
                    </div>
                    <Link href="/dashboard/practice" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:scale-[1.02] active:scale-95">
                        {"Start today's practice"}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                    <p className="text-sm font-semibold text-blue-100">{"Today's focus"}</p>
                    <p className="mt-3 text-3xl font-bold">{dailyGoalMinutes} min</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                        {`Complete a short speaking warmup for ${goalLabel.toLowerCase()} and unlock your first progress insight.`}
                    </p>
                    {/* Phase 10 — live XP & level snapshot */}
                    <div className="mt-4 border-t border-white/10 pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-blue-100">{`Level ${progress?.current_level ?? 1}`}</span>
                            <span className="font-bold text-white">{`${(progress?.total_xp ?? 0).toLocaleString()} XP`}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                            <div
                                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                                style={{ width: `${Math.min(progress?.level_progress_percent ?? 0, 100)}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-300">
                            {progress
                                ? `${progress.xp_needed_for_next} XP to Level ${progress.current_level + 1}`
                                : "Start practising to earn XP."}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}


