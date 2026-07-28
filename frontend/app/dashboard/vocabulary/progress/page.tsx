"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    AlertCircle,
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    Flame,
    GraduationCap,
    HelpCircle,
    Loader2,
    RefreshCw,
    Sparkles,
    Star,
    Target,
    Trophy,
    XCircle,
    Zap,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard";
import {
    getVocabProgress,
    type VocabProgressResponse,
} from "@/features/vocabulary/api";

export default function VocabularyProgressPage() {
    const [progress, setProgress] = useState<VocabProgressResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProgress = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getVocabProgress();
            setProgress(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load progress metrics.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgress();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="space-y-6 animate-pulse">
                    <div className="h-32 rounded-[2rem] bg-slate-100" />
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="h-28 rounded-3xl bg-slate-100" />
                        <div className="h-28 rounded-3xl bg-slate-100" />
                        <div className="h-28 rounded-3xl bg-slate-100" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !progress) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-xl py-12">
                    <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm">
                        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
                        <h3 className="mt-4 text-xl font-bold text-slate-900">Failed to Load Dashboard</h3>
                        <p className="mt-2 text-sm text-slate-600">{error || "Could not retrieve progress."}</p>
                        <button
                            type="button"
                            onClick={fetchProgress}
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Retry
                        </button>
                    </section>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl sm:p-8">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
                    <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden="true" />

                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-200">
                                <Award className="h-4 w-4" aria-hidden="true" />
                                Vocabulary Mastery
                            </div>
                            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Vocabulary Progress</h1>
                            <p className="max-w-xl text-base text-slate-300">
                                Track your learned words, quiz performance, and retention status over time.
                            </p>
                        </div>

                        <Link
                            href="/dashboard/vocabulary/quiz"
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                        >
                            <Zap className="h-5 w-5 text-amber-300" aria-hidden="true" />
                            Take Vocabulary Quiz
                        </Link>
                    </div>
                </section>

                {/* Key Metric Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Total Saved */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                <BookOpen className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Total Saved</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-900">{progress.total_saved_words}</p>
                        <p className="mt-1 text-xs text-slate-400">Words in personal collection</p>
                    </div>

                    {/* Mastered Words */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Mastered</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-emerald-600">{progress.mastered_words_count}</p>
                        <p className="mt-1 text-xs text-slate-400">&ge;3 consecutive correct answers</p>
                    </div>

                    {/* Overall Accuracy */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                <Target className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Overall Accuracy</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-sky-600">{progress.overall_accuracy_percentage}%</p>
                        <p className="mt-1 text-xs text-slate-400">Across all quiz questions</p>
                    </div>

                    {/* Quizzes Taken */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-500">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                                <Trophy className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Quizzes Completed</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-900">{progress.total_quizzes_taken}</p>
                        <p className="mt-1 text-xs text-slate-400">Completed quiz sessions</p>
                    </div>
                </div>

                {/* Mastery Status Breakdown Card */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900">Mastery Breakdown</h2>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Mastered</span>
                                <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                                    {progress.mastered_words_count}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">High accuracy &bull; Retained in long-term memory</p>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Learning</span>
                                <span className="rounded-full bg-blue-200/80 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                                    {progress.learning_words_count}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">Moderate accuracy &bull; Practiced recently</p>
                        </div>

                        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Needs Revision</span>
                                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                                    {progress.needs_revision_count}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">Low accuracy or untested &bull; Recommended for quiz</p>
                        </div>
                    </div>
                </section>

                {/* Strongest vs. Weakest Words Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Strongest Words */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-500" aria-hidden="true" />
                            <h2 className="text-lg font-bold text-slate-900">Strongest Words</h2>
                        </div>
                        {progress.strongest_words.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {progress.strongest_words.map((w, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-800"
                                    >
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                                        {w}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Take a quiz to identify your strongest words!</p>
                        )}
                    </section>

                    {/* Weakest Words */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-rose-500" aria-hidden="true" />
                            <h2 className="text-lg font-bold text-slate-900">Needs Practice</h2>
                        </div>
                        {progress.weakest_words.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {progress.weakest_words.map((w, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-sm font-semibold text-rose-800"
                                    >
                                        <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
                                        {w}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No weak words identified yet.</p>
                        )}
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
