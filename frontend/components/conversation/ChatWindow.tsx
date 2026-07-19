"use client";

import { useEffect, useRef } from "react";
import { useConversation } from "@/features/conversation/ConversationContext";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";

/**
 * Scrollable conversation transcript.
 *
 * Phase 2 polish:
 * - Subtle blue/gray gradient background (ChatGPT/Claude-like) instead of
 *   plain white, while keeping high contrast for readability.
 * - Increased vertical spacing between bubbles so the transcript feels
 *   less cramped.
 * - Smart auto-scroll: scrolls smoothly to the newest message only when
 *   the user is already near the bottom. This preserves history and
 *   avoids yanking the view while the user is reading older messages.
 *
 * Phase 3:
 * - Renders the TypingIndicator while Emma is "typing" a reply.
 * - Auto-scrolls while typing and on completion so the latest state is
 *   always visible (when the user is near the bottom).
 *
 * Phase 3 Part 2:
 * - The in-transcript completion banner was removed. The full completion
 *   experience (summary card, rating, export, follow-up actions) is now
 *   rendered by <ConversationComplete /> in the page layout, keeping the
 *   transcript focused on the conversation itself (Task 1).
 */
export default function ChatWindow() {
    const { messages, isTyping, isCompleted } = useConversation();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    /**
     * Track whether the user is near the bottom of the transcript.
     * We only auto-scroll when they are, so reading older messages is
     * never interrupted by an incoming message.
     */
    const isNearBottom = () => {
        const el = scrollRef.current;
        if (!el) return true;
        const threshold = 120; // px from bottom considered "near"
        return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };

    // Auto-scroll to the latest message (only when already near the bottom).
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !bottomRef.current) return;

        // On the very first message, always jump so the greeting is visible.
        const shouldScroll = messages.length <= 1 || isNearBottom();
        if (!shouldScroll) return;

        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, isTyping, isCompleted]);

    return (
        <div className="flex h-full flex-col">
            <div
                ref={scrollRef}
                className="flex-1 space-y-6 overflow-y-auto px-3 py-6 sm:px-5 sm:py-7"
                style={{
                    scrollbarGutter: "stable",
                }}
            >
                {messages.map((message) => (
                    <ChatBubble key={message.id} message={message} />
                ))}

                {/* Typing indicator — shown while Emma composes a reply. */}
                {isTyping && <TypingIndicator />}

                <div ref={bottomRef} className="h-px w-full flex-shrink-0" />
            </div>
        </div>
    );
}
