"use client";

import { History } from "lucide-react";

/**
 * Page header for the Conversation History page.
 *
 * Shows the page title, a short description, and the total conversation
 * count so the learner knows how many sessions they have stored.
 * Purely presentational — no state, no API calls.
 */
type ConversationHistoryHeaderProps = {
    /** Total number of conversations available (after any filtering is applied by the parent). */
    count: number;
};

export default function ConversationHistoryHeader({
    count,
}: ConversationHistoryHeaderProps) {
    return (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <History className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900">
                        Conversation History
                    </h1>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">
                        Browse, review, and continue your past AI conversations.
                    </p>
                </div>
            </div>
            <span
                className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                aria-label={`Total conversations: ${count}`}
            >
                {count} {count === 1 ? "conversation" : "conversations"}
            </span>
        </header>
    );
}
