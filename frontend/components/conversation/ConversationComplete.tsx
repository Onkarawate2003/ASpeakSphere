"use client";

import { useConversation } from "@/features/conversation/ConversationContext";
import ConversationSummary from "./ConversationSummary";
import ConversationRating from "./ConversationRating";
import ConversationExport from "./ConversationExport";
import FollowUpActions from "./FollowUpActions";

/**
 * Completion experience wrapper.
 *
 * Renders the full post-completion UI — session summary, rating widget,
 * export/copy actions, and follow-up action cards — but ONLY when the
 * conversation is completed (`isCompleted`). Until then it renders
 * nothing, so the live transcript stays uncluttered (Task 11).
 *
 * This composes the existing Phase 3 Part 1 components without
 * duplicating any logic; everything reads from ConversationContext.
 */
export default function ConversationComplete() {
    const { isCompleted } = useConversation();

    if (!isCompleted) {
        return null;
    }

    return (
        <div className="space-y-5">
            <ConversationSummary />
            <ConversationRating />
            <ConversationExport />
            <FollowUpActions />
        </div>
    );
}
