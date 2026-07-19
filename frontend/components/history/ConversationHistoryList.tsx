"use client";

import type { ConversationListItemDTO } from "@/features/conversation/types";
import ConversationHistoryCard from "./ConversationHistoryCard";

/**
 * The scrollable list of conversation history cards.
 *
 * Receives the already-filtered + already-sorted list from the parent page
 * so this component stays purely presentational. Deletion is delegated to
 * the parent via `onDelete`.
 */
type ConversationHistoryListProps = {
    /** Filtered + sorted conversations to render. */
    conversations: ConversationListItemDTO[];
    /** Callback invoked when the learner confirms deletion of a conversation. */
    onDelete: (id: number) => void;
    /** Whether a deletion is currently in flight. */
    isDeleting: boolean;
};

export default function ConversationHistoryList({
    conversations,
    onDelete,
    isDeleting,
}: ConversationHistoryListProps) {
    return (
        <div className="space-y-4" role="list" aria-label="Conversation history list">
            {conversations.map((conversation) => (
                <div key={conversation.id} role="listitem">
                    <ConversationHistoryCard
                        conversation={conversation}
                        onDelete={onDelete}
                        isDeleting={isDeleting}
                    />
                </div>
            ))}
        </div>
    );
}
