"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    History,
    ListChecks,
    PlayCircle,
    Sparkles,
} from "lucide-react";

import { DashboardLayout } from "../../../../components/dashboard";
import {
    EmptyState,
    ErrorState,
    LoadingSkeleton,
} from "../../../../components/dashboard";
import { ConversationProvider } from "@/features/conversation/ConversationContext";
import { prepareContinueConversation } from "@/features/conversation/ConversationContext";
import ConversationSummary from "@/components/conversation/ConversationSummary";
import ConversationTranscript from "@/components/conversation/ConversationTranscript";
import { getConversation } from "@/features/conversation/api";
import type { ConversationDetailDTO } from "@/features/conversation/types";
import {
    formatDuration,
    formatHistoryDate,
    getPracticeLabel,
    getStatusLabel,
} from "@/components/history/historyUtils";

/**
 * Conversation detail page (Phase 8 — Task 5/6/7/8).
 *
 * Loads a single conversation via the existing `GET /api/conversations/{id}`
 * endpoint and renders it using the existing conversation components:
 *  - `ConversationSummary` + `ConversationStats` + `ConversationTimeline`
 *
 * Two modes:
 *  - `status === "ended"` → read-only transcript view (no input, no
 *    restart/end/voice controls).
 *  - `status === "active"` → "Continue Conversation" button that seeds
 *    sessionStorage and navigates to the live conversation page so Emma
 *    resumes with the full stored history.
 *
 * The context-dependent components are rendered inside a
 * `ConversationProvider` so they can read `useConversation()` unchanged.
 * The provider is given the conversation's `practice_type` so the labels
 * and difficulty match the stored session.
 *
 * Route: this lives at a static path (`/dashboard/history/view`) with the
 * conversation id passed as a `?id=` query string rather than a dynamic
 * `[id]` path segment. `output: "export"` (Capacitor static build) requires
 * every dynamic path segment to be enumerable at build time via
 * `generateStaticParams()`; conversation ids are per-user database rows
 * created at runtime, so they can't be enumerated. A query string carries
 * the same value without Next.js needing to know it ahead of time.
 */
export default function ConversationDetailPage() {
    return (
        <Suspense
            fallback={
                <DashboardLayout>
                    <LoadingSkeleton rows={4} />
                </DashboardLayout>
            }
        >
            <ConversationDetailPageContent />
        </Suspense>
    );
}

/**
 * `useSearchParams()` opts the tree above it out of static rendering during
 * `output: "export"`, so it must sit below a `Suspense` boundary (the
 * `ConversationDetailPage` wrapper above) rather than at the page's top
 * level.
 */
function ConversationDetailPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const conversationId = Number(searchParams.get("id"));

    const [detail, setDetail] = useState<ConversationDetailDTO | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadDetail = useCallback(async () => {
        if (!Number.isFinite(conversationId) || conversationId <= 0) {
            setError("Invalid conversation id.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await getConversation(conversationId);
            setDetail(data);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not load this conversation. Please try again.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    const isActive = detail?.status === "active";

    /**
     * Continue an active conversation: seed sessionStorage so the live
     * conversation page auto-loads this conversation on mount, then
     * navigate to `/dashboard/conversation?practice=<type>`.
     */
    const handleContinue = useCallback(() => {
        if (!detail) return;
        prepareContinueConversation(detail.id, detail.practice_type);
        router.push(
            `/dashboard/conversation?practice=${detail.practice_type}`,
        );
    }, [detail, router]);

    return (
        <DashboardLayout>
            {/* Back link */}
            <Link
                href="/dashboard/history"
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-label="Back to conversation history"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to History
            </Link>

            {/* Loading state */}
            {isLoading && (
                <div className="space-y-4">
                    <LoadingSkeleton rows={4} />
                </div>
            )}

            {/* Error state */}
            {!isLoading && error && (
                <ErrorState
                    title="Failed to load conversation"
                    description={error}
                    onRetry={loadDetail}
                />
            )}

            {/* Invalid id */}
            {!isLoading && !error && !detail && (
                <EmptyState
                    title="Conversation not found"
                    description="This conversation may have been deleted or does not exist."
                    actionLabel="Back to History"
                    actionHref="/dashboard/history"
                />
            )}

            {/* Loaded — render the detail */}
            {!isLoading && !error && detail && (
                <ConversationProvider
                    practiceType={detail.practice_type}
                    lessonId={detail.lesson_id}
                    lessonTitle={detail.lesson_title}
                    lessonObjectives={detail.lesson_objectives}
                    initialDetail={detail}
                >
                    <ConversationDetailContent
                        detail={detail}
                        isActive={isActive}
                        onContinue={handleContinue}
                    />
                </ConversationProvider>
            )}
        </DashboardLayout>
    );
}

/* ------------------------------------------------------------------ *
 * Inner content — rendered inside <ConversationProvider> so the
 * reused conversation components can call useConversation().
 * ------------------------------------------------------------------ */

type ConversationDetailContentProps = {
    detail: ConversationDetailDTO;
    isActive: boolean;
    onContinue: () => void;
};

function ConversationDetailContent({
    detail,
    isActive,
    onContinue,
}: ConversationDetailContentProps) {
    const practiceLabel = getPracticeLabel(detail.practice_type);
    const statusLabel = getStatusLabel(detail.status);
    const isCompleted = detail.status === "ended";
    const xpEarned = detail.xp_earned ?? 0;
    const durationLabel = formatDuration(detail.duration_seconds);
    const hasObjectives =
        Array.isArray(detail.lesson_objectives) &&
        detail.lesson_objectives.length > 0;

    return (
        <div className="space-y-6">
            {/* Header card */}
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                        <History className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">
                            {practiceLabel}
                        </h1>
                        {/* Phase 9 — show the lesson title when the conversation
                            belongs to a structured lesson. */}
                        {detail.lesson_title ? (
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                                <span
                                    className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                    aria-hidden="true"
                                />
                                {detail.lesson_title}
                            </p>
                        ) : null}
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                            Started {formatHistoryDate(detail.started_at)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Phase 10.5 PART 5 — read-only "Completed Session" badge
                        for ended conversations. Active conversations keep the
                        "In Progress" pill + Continue button. */}
                    {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                            Completed Session
                        </span>
                    ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            {statusLabel}
                        </span>
                    )}
                    {isActive && (
                        <button
                            type="button"
                            onClick={onContinue}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            aria-label="Continue this conversation"
                        >
                            <PlayCircle className="h-4 w-4" aria-hidden="true" />
                            Continue Conversation
                        </button>
                    )}
                </div>
            </header>

            {/* Phase 10.5 PART 10 — Lesson information panel.
                Surfaces the lesson title, practice mode, objectives, session
                date, duration and status in one place. Only the objectives
                block is conditional (free-form sessions have none). */}
            <section
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                aria-label="Lesson information"
            >
                <div className="mb-4 flex items-center gap-2">
                    <ListChecks
                        className="h-4 w-4 text-blue-600"
                        aria-hidden="true"
                    />
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                        Lesson Information
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <LessonInfoFact
                        icon={History}
                        label="Practice Mode"
                        value={practiceLabel}
                    />
                    <LessonInfoFact
                        icon={Calendar}
                        label="Session Date"
                        value={formatHistoryDate(detail.started_at)}
                    />
                    <LessonInfoFact
                        icon={Clock}
                        label="Duration"
                        value={durationLabel}
                    />
                    <LessonInfoFact
                        icon={CheckCircle2}
                        label="Status"
                        value={statusLabel}
                    />
                </div>

                {/* Lesson title (when the conversation belongs to a lesson). */}
                {detail.lesson_title ? (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Lesson
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {detail.lesson_title}
                        </p>
                    </div>
                ) : null}

                {/* Lesson objectives (when present). */}
                {hasObjectives ? (
                    <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Objectives
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                            {detail.lesson_objectives!.map((objective, index) => (
                                <li
                                    key={`${index}-${objective.slice(0, 24)}`}
                                    className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"
                                >
                                    <span
                                        className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                                        aria-hidden="true"
                                    />
                                    {objective}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {/* XP earned (completed sessions only). */}
                {isCompleted && xpEarned > 0 ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-amber-700">
                        <Award className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-bold">
                            +{xpEarned} XP earned
                        </span>
                    </div>
                ) : null}
            </section>

            {/* Reused conversation components.
                These read from useConversation() via the provider above
                (hydrated from `initialDetail` — Phase 10.5 PART 2/3).
                ConversationSummary already renders ConversationStats inside
                it, so the stats are not duplicated here.
                For ended conversations this is a read-only review:
                no input, no restart/end/voice controls are rendered. */}
            <ConversationSummary />

            {/* Phase 10.5 PART 4 — Full chronological transcript reusing
                ChatBubble (Emma left / learner right). Distinct from the
                compact ConversationTimeline snippet view. */}
            <ConversationTranscript />

            {/* Phase 10.5 PART 12 — Reserved "AI Session Review" placeholder.
                Empty for now; Phase 11 will populate this with AI-generated
                feedback on the learner's performance. Kept here so the layout
                is ready and the section is visibly reserved. */}
            <section
                className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-5"
                aria-label="AI Session Review (coming soon)"
            >
                <div className="flex items-center gap-2">
                    <Sparkles
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                    />
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-500">
                        AI Session Review
                    </h2>
                    <span className="ml-auto rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Coming soon
                    </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    An AI-powered review of your conversation — including
                    strengths, areas to improve, and suggested next steps —
                    will appear here in a future update.
                </p>
            </section>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Small presentational helper for the lesson information facts grid.
 * ------------------------------------------------------------------ */

type LessonInfoFactProps = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
};

function LessonInfoFact({ icon: Icon, label, value }: LessonInfoFactProps) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
        </div>
    );
}
