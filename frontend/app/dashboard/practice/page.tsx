"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { DashboardLayout } from "../../../components/dashboard";
import { practiceCategories } from "../../../components/dashboard/mockData";
import StartSessionCard from "../../../components/conversation/StartSessionCard";
import { useAuth } from "@/features/auth/AuthContext";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { learningGoalLabels } from "@/features/dashboard/dashboardMappings";

export default function PracticePage() {
    const { user } = useAuth();
    const { preferences } = useDashboard();

    const firstName = preferences?.display_name?.trim() || user?.first_name || "Learner";
    const goalLabel = preferences?.learning_goal
        ? learningGoalLabels[preferences.learning_goal] || preferences.learning_goal
        : "Daily speaking";
    const dailyGoalMinutes = preferences?.daily_goal_minutes ?? 10;

    // Single-select practice mode for the AI conversation module (Phase 1).
    const [selectedPracticeType, setSelectedPracticeType] = useState<string | null>(null);
    const selectedCategory = practiceCategories.find((c) => c.practiceType === selectedPracticeType) ?? null;

    return (
        <DashboardLayout>
            <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" aria-hidden="true" />

                <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
                    <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                            Practice studio
                        </div>
                        <div className="space-y-3">
                            <h1 className="max-w-2xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{`Welcome, ${firstName}.`}</h1>
                            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Choose a practice mode to begin. Live AI conversation modules will plug into these modes in upcoming releases.</p>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                        <p className="text-sm font-semibold text-blue-100">{"Today's focus"}</p>
                        <p className="mt-3 text-3xl font-bold">{dailyGoalMinutes} min</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{`Complete a short speaking warmup for ${goalLabel.toLowerCase()} to start your streak.`}</p>
                    </div>
                </div>
            </section>

            {/* Conversation categories — ACTIVE entry points */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-slate-500">Conversation categories</p>
                        <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-900">Choose a practice mode</h2>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {practiceCategories.map((category) => {
                        const Icon = category.icon;
                        const isActive = selectedPracticeType === category.practiceType;

                        return (
                            <button
                                key={category.title}
                                type="button"
                                onClick={() =>
                                    setSelectedPracticeType(isActive ? null : category.practiceType)
                                }
                                aria-pressed={isActive}
                                className={`group rounded-3xl bg-gradient-to-br ${category.tone} p-5 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 ${isActive
                                    ? "ring-4 ring-blue-500/50 scale-[1.02] shadow-xl"
                                    : "ring-0"
                                    }`}
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <h3 className="mt-4 text-base font-bold">{category.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-white/80">{category.description}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Phase 9 — Start session now routes to the Lesson Selection
                page so the learner picks a structured lesson before the
                conversation. The lessons page forwards to the
                conversation page with the chosen lesson. */}
            <StartSessionCard
                selectedLabel={selectedCategory?.title ?? null}
                selectedPracticeType={selectedCategory?.practiceType ?? null}
                href="/dashboard/lessons"
            />
        </DashboardLayout>
    );
}
