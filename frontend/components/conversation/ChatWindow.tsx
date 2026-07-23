"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { TUTOR_NAME } from "@/features/conversation/constants";
import type { ConversationMessage } from "@/features/conversation/types";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";

/** Maximum characters announced for a newly-arrived AI message (screen readers). */
const ANNOUNCEMENT_MAX_LENGTH = 160;

type GroupedMessage = {
    message: ConversationMessage;
    /** True when the previous message (if any) was from a different sender. */
    isFirstInGroup: boolean;
    /** True when the next message (if any) is from a different sender. */
    isLastInGroup: boolean;
};

/**
 * Derive grouping metadata for consecutive same-sender messages, purely
 * from the existing `messages` array — no change to `ConversationMessage`
 * or `ConversationContext`. A message starts a new group when the previous
 * message doesn't exist or has a different `role`; it ends a group when
 * the next message doesn't exist or has a different `role`. Message order
 * is untouched — this only annotates the existing array.
 */
function groupMessages(messages: ConversationMessage[]): GroupedMessage[] {
    return messages.map((message, index) => {
        const previous = messages[index - 1];
        const next = messages[index + 1];
        return {
            message,
            isFirstInGroup: !previous || previous.role !== message.role,
            isLastInGroup: !next || next.role !== message.role,
        };
    });
}

/** Truncate a message body to a single-line snippet for the a11y announcement. */
function toAnnouncementSnippet(content: string): string {
    const collapsed = content.replace(/\s+/g, " ").trim();
    if (collapsed.length <= ANNOUNCEMENT_MAX_LENGTH) {
        return collapsed;
    }
    return `${collapsed.slice(0, ANNOUNCEMENT_MAX_LENGTH).trimEnd()}…`;
}

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
 *
 * Phase 4 — Premium transcript polish:
 * - Message grouping (`groupMessages`, memoized on `messages`) replaces
 *   the previous uniform `space-y-6` with per-message spacing: a tight
 *   gap between consecutive same-sender messages, and the original
 *   comfortable gap whenever the sender changes. `ChatBubble` uses the
 *   same grouping metadata to show the avatar/name/timestamp only once
 *   per group. Auto-scroll, scrollbar-gutter stability, and the entrance
 *   animation are all unchanged.
 * - A visually-hidden `aria-live` region announces newly-arrived AI
 *   messages (not just the typing state, which `TypingIndicator` already
 *   announces) — derived entirely from the existing `messages` array, no
 *   change to conversation logic.
 */
export default function ChatWindow() {
    const { messages, isTyping, isCompleted } = useConversation();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    // Phase 4 — grouping is a pure derivation of `messages`; memoized so it
    // only recomputes when the message list itself changes, not on every
    // unrelated re-render (e.g. avatar/playback state ticking inside a
    // ChatBubble further down the tree).
    const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

    // Phase 4 — accessibility: announce newly-arrived AI messages. Purely
    // local UI state derived from `messages`; does not touch
    // ConversationContext or any conversation logic.
    const [announcement, setAnnouncement] = useState("");
    const lastAnnouncedIdRef = useRef<string | null>(null);
    useEffect(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const message = messages[i];
            if (message.role === "ai") {
                if (message.id !== lastAnnouncedIdRef.current) {
                    lastAnnouncedIdRef.current = message.id;
                    setAnnouncement(
                        `${TUTOR_NAME} says: ${toAnnouncementSnippet(message.content)}`,
                    );
                }
                break;
            }
        }
    }, [messages]);

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

    /**
     * Runtime fix: `isNearBottom()` must reflect whether the user was near
     * the bottom BEFORE the incoming content is measured, not after. The AI
     * reply that replaces the typing indicator (and, with Phase 4's
     * paragraph/list formatting, any multi-part reply) can add more than
     * the 120px threshold's worth of height on its own — so computing
     * `isNearBottom()` inside the auto-scroll effect (i.e. after that
     * content has already been committed to the DOM) measures a distance
     * that the update itself just created, wrongly concluding the user
     * wasn't near the bottom even when they genuinely were a moment
     * earlier. `wasNearBottomRef` tracks the same `isNearBottom()` check,
     * but continuously via the container's native scroll events, so its
     * value always reflects the user's last real scroll position —
     * captured before any new message changes the content height.
     */
    const wasNearBottomRef = useRef<boolean>(true);

    // Seed the ref from a real measurement once mounted (e.g. restoring a
    // long conversation from history), so the very first render behaves
    // exactly as before this fix. Every later message arrival relies on
    // `handleScroll` below instead.
    useEffect(() => {
        wasNearBottomRef.current = isNearBottom();
    }, []);

    /** Keep `wasNearBottomRef` in sync with the user's actual scroll
     *  position, independent of whatever content is about to render. */
    const handleScroll = () => {
        wasNearBottomRef.current = isNearBottom();
    };

    // Auto-scroll to the latest message (only when the user was already
    // near the bottom BEFORE this update — see `wasNearBottomRef` above).
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !bottomRef.current) return;

        // On the very first message, always jump so the greeting is visible.
        const shouldScroll = messages.length <= 1 || wasNearBottomRef.current;
        if (!shouldScroll) return;

        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, isTyping, isCompleted]);

    return (
        <div className="flex h-full flex-col">
            {/* Accessible live region — announces newly-arrived AI messages,
                separate from TypingIndicator's own "Emma is typing" region. */}
            <span className="sr-only" aria-live="polite" role="status">
                {announcement}
            </span>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 py-6 sm:px-5 sm:py-7"
                style={{
                    scrollbarGutter: "stable",
                }}
            >
                {groupedMessages.map(({ message, isFirstInGroup, isLastInGroup }, index) => (
                    <div
                        key={message.id}
                        className={index === 0 ? "" : isFirstInGroup ? "mt-6" : "mt-1.5"}
                    >
                        <ChatBubble
                            message={message}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                        />
                    </div>
                ))}

                {/* Typing indicator — shown while Emma composes a reply. Always
                    starts a new visual group (Emma's turn beginning), so it
                    uses the same spacing a new group would get. */}
                {isTyping && (
                    <div className={groupedMessages.length === 0 ? "" : "mt-6"}>
                        <TypingIndicator />
                    </div>
                )}

                <div ref={bottomRef} className="h-px w-full flex-shrink-0" />
            </div>
        </div>
    );
}
