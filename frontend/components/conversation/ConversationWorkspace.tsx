"use client";

import type { ReactNode } from "react";

type ConversationWorkspaceProps = {
    children: ReactNode;
};

/**
 * Phase 1 — Focused Conversation Workspace.
 *
 * Chrome-free layout used only while a conversation session is active
 * (`status === "active"`). It intentionally mirrors `DashboardLayout`'s
 * outer `<main>` background/text color so switching between the two
 * layouts produces no visual flash, but omits the dashboard `Sidebar`,
 * `TopNavbar`, and the `max-w-7xl` content cap so the conversation
 * occupies the full viewport (Phase 1 requirement 1).
 *
 * This component renders no providers of its own — authentication and
 * all conversation/voice state are already established above it in the
 * tree (`ProtectedRoute` in `app/dashboard/layout.tsx`, and
 * `ConversationProvider` / `VoiceProvider` in the conversation page), so
 * swapping between this and `DashboardLayout` never remounts any state.
 *
 * Everything rendered inside (`ConversationHeader`, the existing grid,
 * every card) is unchanged — this wrapper only replaces the surrounding
 * chrome, not the content's own layout/spacing.
 */
export default function ConversationWorkspace({
    children,
}: ConversationWorkspaceProps) {
    return (
        <main className="min-h-screen bg-[#EEF3FA] text-slate-900">
            <div className="flex min-h-screen flex-col">{children}</div>
        </main>
    );
}
