"use client";

import { useConversation } from "@/features/conversation/ConversationContext";
import ConversationSummary from "./ConversationSummary";
import ConversationRating from "./ConversationRating";
import ConversationExport from "./ConversationExport";
import FollowUpActions from "./FollowUpActions";
import { AISessionReview } from "./AISessionReview";

/**
 * Completion experience wrapper.
 *
 * Renders the full post-completion UI — session summary, AI review card,
 * rating widget, export/copy actions, and follow-up action cards — but ONLY
 * when the conversation is completed (`isCompleted`). Until then it renders
 * nothing, so the live transcript stays uncluttered (Task 11).
 *
 * Phase 1 — the AI Session Review card is mounted directly below the summary.
 * It reads evaluation data from ConversationContext, showing a shimmer
 * skeleton while the background AI task is running, then resolves into the
 * full coaching card (score, feedback, strengths, areas to improve, next step).
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
            {/* Phase 1 — AI Session Review: shows skeleton while polling,
                then the real coaching card once the background task completes. */}
            <AISessionReview />
            <ConversationRating />
            <ConversationExport />
            <FollowUpActions />
        </div>
    );
}

