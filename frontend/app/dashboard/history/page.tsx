"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../../components/dashboard";
import {
    EmptyState,
    ErrorState,
    LoadingSkeleton,
} from "../../../components/dashboard";
import ConversationHistoryHeader from "@/components/history/ConversationHistoryHeader";
import ConversationHistoryFilters from "@/components/history/ConversationHistoryFilters";
import ConversationHistoryList from "@/components/history/ConversationHistoryList";
import ConversationHistoryEmpty from "@/components/history/ConversationHistoryEmpty";
import {
    filterConversations,
    sortConversations,
    type HistoryFilter,
    type HistorySort,
} from "@/components/history/historyUtils";
import {
    deleteConversation,
    getUserConversations,
} from "@/features/conversation/api";
import type { ConversationListItemDTO } from "@/features/conversation/types";
import { showConfirmationAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetAlert";

/**
 * Conversation History page (Phase 8).
 *
 * Lists every conversation the authenticated user has stored in PostgreSQL
 * via the existing `GET /api/conversations` endpoint. Supports client-side
 * filtering by practice type and sorting by date, plus deletion through the
 * existing `DELETE /api/conversations/{id}` endpoint with a SweetAlert
 * confirmation dialog.
 *
 * No backend changes, no new APIs — everything reuses the existing
 * conversation endpoints and the dashboard design language.
 */
export default function HistoryPage() {
    const [conversations, setConversations] = useState<ConversationListItemDTO[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<HistoryFilter>("all");
    const [sort, setSort] = useState<HistorySort>("newest");
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    /** Fetch the user's conversations from the existing backend endpoint. */
    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const items = await getUserConversations(0, 50);
            setConversations(items);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Could not load your conversation history. Please try again.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load on mount.
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    /** Apply the current filter + sort client-side (no backend calls). */
    const visibleConversations = useMemo(() => {
        const filtered = filterConversations(conversations, filter);
        return sortConversations(filtered, sort);
    }, [conversations, filter, sort]);

    /**
     * Delete a conversation after a SweetAlert confirmation.
     * Reuses the existing `DELETE /api/conversations/{id}` endpoint and the
     * shared `showConfirmationAlert` helper so the dialog matches the rest
     * of the app. The list is refreshed after a successful deletion.
     */
    const handleDelete = useCallback(
        async (id: number) => {
            const result = await showConfirmationAlert({
                title: "Are you sure?",
                text: "This action cannot be undone.",
                confirmButtonText: "Delete",
                cancelButtonText: "Cancel",
            });
            if (!result.isConfirmed) return;

            setIsDeleting(true);
            try {
                await deleteConversation(id);
                setConversations((prev) => prev.filter((c) => c.id !== id));
                await showSuccessAlert({ title: "Deleted Successfully" });
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Could not delete the conversation. Please try again.";
                await showErrorAlert({ title: "Delete Failed", text: message });
            } finally {
                setIsDeleting(false);
            }
        },
        [],
    );

    return (
        <DashboardLayout>
            <ConversationHistoryHeader count={conversations.length} />

            {/* Loading state — reuse the dashboard skeleton. */}
            {isLoading && (
                <div className="space-y-4">
                    <LoadingSkeleton rows={4} />
                </div>
            )}

            {/* Error state — reuse the dashboard error card. */}
            {!isLoading && error && (
                <ErrorState
                    title="Failed to load history"
                    description={error}
                    onRetry={loadHistory}
                />
            )}

            {/* Loaded + has conversations → show filters + list. */}
            {!isLoading && !error && conversations.length > 0 && (
                <div className="space-y-4">
                    <ConversationHistoryFilters
                        filter={filter}
                        onFilterChange={setFilter}
                        sort={sort}
                        onSortChange={setSort}
                    />
                    {visibleConversations.length > 0 ? (
                        <ConversationHistoryList
                            conversations={visibleConversations}
                            onDelete={handleDelete}
                            isDeleting={isDeleting}
                        />
                    ) : (
                        /* Filter produced no results — show a scoped empty state. */
                        <EmptyState
                            title="No conversations match this filter"
                            description="Try selecting a different practice type to see your sessions."
                        />
                    )}
                </div>
            )}

            {/* Loaded + no conversations at all → show the primary empty state. */}
            {!isLoading && !error && conversations.length === 0 && (
                <ConversationHistoryEmpty />
            )}
        </DashboardLayout>
    );
}
