"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LearnGrammar from "@/features/grammar-coach/components/LearnGrammar";
import CheckGrammar from "@/features/grammar-coach/components/CheckGrammar";

type GrammarCoachTab = "learn" | "check";

export default function GrammarCoachPage() {
    const [activeTab, setActiveTab] = useState<GrammarCoachTab>("learn");

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                    <div
                        className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl"
                        aria-hidden="true"
                    />
                    <div
                        className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
                        aria-hidden="true"
                    />
                    <div className="relative space-y-2">
                        <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                            Grammar Coach
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                            Build your grammar skills or check your writing.
                        </p>
                    </div>
                </section>

                <div
                    className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
                    role="tablist"
                    aria-label="Grammar Coach modes"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "learn"}
                        aria-controls="learn-grammar-panel"
                        id="learn-grammar-tab"
                        onClick={() => setActiveTab("learn")}
                        className={`rounded-xl px-3 py-3 text-sm font-bold transition sm:px-5 ${activeTab === "learn"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                            }`}
                    >
                        Grammar Curriculum
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "check"}
                        aria-controls="check-grammar-panel"
                        id="check-grammar-tab"
                        onClick={() => setActiveTab("check")}
                        className={`rounded-xl px-3 py-3 text-sm font-bold transition sm:px-5 ${activeTab === "check"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                            }`}
                    >
                        Check Grammar
                    </button>
                </div>

                {activeTab === "learn" ? (
                    <LearnGrammar />
                ) : (
                    <CheckGrammar />
                )}
            </div>
        </DashboardLayout>
    );
}
