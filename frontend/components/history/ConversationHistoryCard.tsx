"use client";

import Link from "next/link";
import { Award, CheckCircle2, Clock, MessageSquare, PlayCircle, Trash2 } from "lucide-react";
import type { ConversationListItemDTO } from "@/features/conversation/types";
import {
    formatDuration,
    formatHistoryDate,
    getPracticeLabel,
    getStatusLabel,
} from "./historyUtils";

/**
 * A single conversation row in the history list (Phase 10.5 — enhanced).
 *
 * Displays the practice type, lesson title, status badge, started date,
 * duration, message count, and XP earned (for completed sessions). A
 * "Completed" badge with a check icon is shown for ended conversations so
 * the learner can instantly tell which sessions are finished. Provides two
 * actions:
 *  - "View" / "Continue" → navigates to the detail page.
 *  - "Delete" → triggers the SweetAlert confirmation (handled by the parent).
 *
 * The whole card is keyboard-accessible: the primary action is a real link
 * and the delete button is a real `<button>` with an `aria-label`.
 */
type ConversationHistoryCardProps = {
    /** The conversation list item from `GET /api/conversations`. */
    conversation: ConversationListItemDTO;
    /** Callback invoked when the learner confirms deletion. */
    onDelete: (id: number) => void;
    /** Whether a deletion is currently in flight (disables the delete button). */
    isDeleting: boolean;
};

export default function ConversationHistoryCard({
    conversation,
    onDelete,
    isDeleting,
}: ConversationHistoryCardProps) {
    const isActive = conversation.status === "active";
    const isCompleted = conversation.status === "ended";
    const primaryLabel = isActive ? "Continue" : "View";
    const primaryHref = `/dashboard/history/view?id=${conversation.id}`;
    const practiceLabel = getPracticeLabel(conversation.practice_type);
    const statusLabel = getStatusLabel(conversation.status);
    // Phase 10.5 — XP earned for this conversation (0 for active sessions or
    // pre-Phase-10 conversations that predate the XP system).
    const xpEarned = conversation.xp_earned ?? 0;

    return (
        <article
            className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            aria-label={`Conversation: ${practiceLabel}, ${statusLabel}, started ${formatHistoryDate(conversation.started_at)}`}
        >
            {/* Summary block */}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                        {practiceLabel}
                    </h3>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                            }`}
                    >
                        {isCompleted && (
                            <CheckCircle2
                                className="h-3 w-3"
                                aria-hidden="true"
                            />
                        )}
                        {statusLabel}
                    </span>
                </div>
                {/* Phase 9 — show the lesson title when the conversation belongs
                    to a structured lesson (null for free-form sessions). */}
                {conversation.lesson_title ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                        <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            aria-hidden="true"
                        />
                        {conversation.lesson_title}
                    </p>
                ) : null}
                <p className="mt-1 text-xs font-medium text-slate-500">
                    {formatHistoryDate(conversation.started_at)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                        {formatDuration(conversation.duration_seconds)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <MessageSquare
                            className="h-3.5 w-3.5 text-indigo-600"
                            aria-hidden="true"
                        />
                        {conversation.message_count}{" "}
                        {conversation.message_count === 1 ? "message" : "messages"}
                    </span>
                    {/* Phase 10.5 — show XP earned for completed sessions that
                        actually earned XP (hides the chip for active sessions or
                        pre-Phase-10 conversations with 0 XP). */}
                    {isCompleted && xpEarned > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-600">
                            <Award className="h-3.5 w-3.5" aria-hidden="true" />
                            +{xpEarned} XP
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
                <Link
                    href={primaryHref}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    aria-label={`${primaryLabel} conversation ${conversation.id}`}
                >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    {primaryLabel}
                </Link>
                <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    disabled={isDeleting}
                    aria-label={`Delete conversation ${conversation.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-3 py-2.5 text-rose-600 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </article>
    );
}
