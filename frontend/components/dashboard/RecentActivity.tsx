"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { ConversationListItemDTO } from "@/features/conversation/types";
import { getUserConversations } from "@/features/conversation/api";
import {
    formatHistoryDate,
    getPracticeLabel,
    getStatusLabel,
    sortConversations,
} from "@/components/history/historyUtils";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";

/**
 * Dashboard sidebar widget showing the learner's three most recent
 * conversations (Phase 8 — Conversation History).
 *
 * Each row surfaces the practice type, started date and status badge, and
 * links to the conversation detail page. A "View All" button routes to the
 * full history page (`/dashboard/history`). When the learner has no
 * conversations yet, the existing `EmptyState` component is reused.
 *
 * Data is fetched from the existing `GET /api/conversations` endpoint via
 * `getUserConversations(0, 3)` — no new API is introduced.
 */
export default function RecentActivity() {
    const [conversations, setConversations] = useState<ConversationListItemDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRecent = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const items = await getUserConversations(0, 3);
            // The backend returns newest-first, but sort defensively so the
            // three most recent are always shown regardless of ordering.
            setConversations(sortConversations(items, "newest").slice(0, 3));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "We couldn't load your recent conversations.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRecent();
    }, [loadRecent]);

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Recent activity"
        >
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Recent activity</p>
                {conversations.length > 0 && (
                    <Link
                        href="/dashboard/history"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        aria-label="View all conversations"
                    >
                        View All
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                )}
            </div>

            <div className="mt-5">
                {isLoading ? (
                    <LoadingSkeleton rows={3} />
                ) : error ? (
                    <EmptyState
                        title="Couldn't load activity"
                        description={error}
                    />
                ) : conversations.length === 0 ? (
                    <EmptyState
                        title="No activity yet"
                        description="Your practice sessions and milestones will appear here once you start speaking."
                        actionLabel="Start Practicing"
                        actionHref="/dashboard/practice"
                    />
                ) : (
                    <ul className="space-y-3" role="list">
                        {conversations.map((conversation) => {
                            const isActive = conversation.status === "active";
                            const statusLabel = getStatusLabel(conversation.status);
                            const practiceLabel = getPracticeLabel(
                                conversation.practice_type,
                            );
                            return (
                                <li key={conversation.id} role="listitem">
                                    <Link
                                        href={`/dashboard/history/${conversation.id}`}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        aria-label={`Conversation: ${practiceLabel}, ${statusLabel}, started ${formatHistoryDate(conversation.started_at)}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-extrabold text-slate-900">
                                                    {practiceLabel}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-600"
                                                        }`}
                                                >
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                <Clock
                                                    className="h-3 w-3 text-blue-600"
                                                    aria-hidden="true"
                                                />
                                                {formatHistoryDate(conversation.started_at)}
                                            </p>
                                        </div>
                                        <ArrowRight
                                            className="h-4 w-4 shrink-0 text-slate-400"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
