"use client";

import { Globe2, Target, UserRound } from "lucide-react";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { useAccent } from "@/features/accent/AccentContext";
import {
    learningGoalLabels,
    proficiencyLevelLabels,
} from "@/features/dashboard/dashboardMappings";

export default function ProfileSummary() {
    const { preferences } = useDashboard();
    // Phase M13 — the accent label comes from the shared AccentContext
    // (which loads it from the backend's AccentManager via /api/accents),
    // removing the duplicate `englishVariantLabels` lookup here.
    const { accentLabel, hasAccent } = useAccent();

    const goalValue = preferences?.learning_goal ? (learningGoalLabels[preferences.learning_goal] || preferences.learning_goal) : "Daily confidence";
    const levelValue = preferences?.proficiency_level ? (proficiencyLevelLabels[preferences.proficiency_level] || preferences.proficiency_level) : "Personalized";
    const variantValue = hasAccent ? accentLabel : "Flexible English";

    const profileItems = [
        { label: "Goal", value: goalValue, icon: Target },
        { label: "Level", value: levelValue, icon: UserRound },
        { label: "Variant", value: variantValue, icon: Globe2 },
    ];


    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Profile summary</p>
            <div className="mt-5 space-y-3">
                {profileItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                                <Icon className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                                <p className="text-sm font-bold text-slate-900">{item.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

