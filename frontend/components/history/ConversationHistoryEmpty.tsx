"use client";

import EmptyState from "@/components/dashboard/EmptyState";

/**
 * Empty state for the Conversation History page.
 *
 * Reuses the existing dashboard `EmptyState` component so the look stays
 * consistent with the rest of the app. Offers a CTA that sends the learner
 * to the Practice page to start their first conversation.
 */
export default function ConversationHistoryEmpty() {
    return (
        <EmptyState
            title="No Conversations Yet"
            description="Start your first AI conversation to build your learning history."
            actionLabel="Start Practicing"
            actionHref="/dashboard/practice"
        />
    );
}
