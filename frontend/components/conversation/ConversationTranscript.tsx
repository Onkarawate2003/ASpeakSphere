"use client";

import { MessagesSquare } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import ChatBubble from "./ChatBubble";

/**
 * Conversation Transcript (Phase 10.5 — PART 4).
 *
 * Renders the FULL chronological transcript of the conversation using the
 * existing [`ChatBubble`](./ChatBubble.tsx) component — Emma's messages are
 * left-aligned white cards with the TutorAvatar, the learner's messages are
 * right-aligned blue bubbles. This is the read-only review view used on the
 * history detail page, distinct from the compact snippet-based
 * [`ConversationTimeline`](./ConversationTimeline.tsx).
 *
 * Reuses the `messages` array already hydrated in `ConversationContext` (via
 * the `initialDetail` prop on the history detail page), so no new state, API
 * call, or context is introduced. An empty state is shown before the session
 * starts.
 */
export default function ConversationTranscript() {
    const { messages, status } = useConversation();

    const hasStarted = status !== "idle" && messages.length > 0;

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Conversation transcript"
        >
            <div className="mb-4 flex items-center gap-2">
                <MessagesSquare
                    className="h-4 w-4 text-blue-600"
                    aria-hidden="true"
                />
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                    Conversation Transcript
                </h2>
                {hasStarted && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                        {messages.length} {messages.length === 1 ? "message" : "messages"}
                    </span>
                )}
            </div>

            {!hasStarted ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs leading-relaxed text-slate-400">
                    The full conversation transcript will appear here once the
                    session has started.
                </p>
            ) : (
                <div className="space-y-4">
                    {messages.map((message) => (
                        <ChatBubble key={message.id} message={message} />
                    ))}
                </div>
            )}
        </section>
    );
}
