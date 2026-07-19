"use client";

import { ArrowDown, ArrowUp, MessageSquare } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { TUTOR_NAME } from "@/features/conversation/constants";
import type { ConversationMessage } from "@/features/conversation/types";

type TimelineEntry = {
    id: string;
    role: ConversationMessage["role"];
    /** Short snippet of the message content (first line / truncated). */
    snippet: string;
    /** Timestamp label from the message. */
    timestamp: string;
};

/** Maximum characters shown per timeline entry snippet. */
const SNIPPET_MAX_LENGTH = 90;

/**
 * Truncate a message body to a single-line snippet for the timeline.
 * Collapses newlines into spaces and caps the length with an ellipsis.
 */
function toSnippet(content: string): string {
    const collapsed = content.replace(/\s+/g, " ").trim();
    if (collapsed.length <= SNIPPET_MAX_LENGTH) {
        return collapsed;
    }
    return `${collapsed.slice(0, SNIPPET_MAX_LENGTH).trimEnd()}…`;
}

/**
 * Conversation Timeline.
 *
 * Renders a compact, chronological list of the conversation turns
 * (Emma ↓ You ↓ Emma ↓ You …) generated directly from the existing
 * `messages` array in `ConversationContext`. No new state, no backend,
 * no duplication of the chat engine — it simply maps the same messages
 * the ChatWindow already renders into a vertical timeline view.
 *
 * Each entry shows a directional arrow (down for Emma, up for the
 * learner), the author label, a short snippet, and the timestamp.
 * An empty state is shown before the session starts.
 */
export default function ConversationTimeline() {
    const { messages, status } = useConversation();

    const entries: TimelineEntry[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        snippet: toSnippet(m.content),
        timestamp: m.timestamp,
    }));

    const hasStarted = status !== "idle" && entries.length > 0;

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Conversation timeline"
        >
            <div className="mb-4 flex items-center gap-2">
                <MessageSquare
                    className="h-4 w-4 text-blue-600"
                    aria-hidden="true"
                />
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                    Conversation Timeline
                </h2>
                {hasStarted && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                        {entries.length} {entries.length === 1 ? "turn" : "turns"}
                    </span>
                )}
            </div>

            {!hasStarted ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs leading-relaxed text-slate-400">
                    Your conversation turns will appear here in order once you
                    start practicing.
                </p>
            ) : (
                <ol className="space-y-1">
                    {entries.map((entry, index) => {
                        const isAI = entry.role === "ai";
                        const isLast = index === entries.length - 1;
                        return (
                            <li
                                key={entry.id}
                                className="relative flex items-start gap-3"
                            >
                                {/* Connector line between entries */}
                                {!isLast && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-slate-200"
                                    />
                                )}

                                {/* Directional arrow badge */}
                                <span
                                    className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-2 ring-white ${isAI
                                        ? "bg-indigo-50 text-indigo-600"
                                        : "bg-blue-50 text-blue-600"
                                        }`}
                                    aria-hidden="true"
                                >
                                    {isAI ? (
                                        <ArrowDown className="h-4 w-4" />
                                    ) : (
                                        <ArrowUp className="h-4 w-4" />
                                    )}
                                </span>

                                {/* Turn content */}
                                <div className="min-w-0 flex-1 pb-3">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span
                                            className={`text-xs font-bold ${isAI ? "text-indigo-700" : "text-blue-700"}`}
                                        >
                                            {isAI ? TUTOR_NAME : "You"}
                                        </span>
                                        <span className="flex-shrink-0 text-[10px] font-medium text-slate-400">
                                            {entry.timestamp}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                        {entry.snippet}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
