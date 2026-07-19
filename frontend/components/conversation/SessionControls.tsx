"use client";

import { LogOut, RotateCcw } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { showConfirmationAlert } from "@/lib/sweetAlert";

/**
 * Session control buttons.
 * - Restart Session: clears messages and returns to the welcome state.
 * - End Session: stops the timer and marks the session as completed so the
 *   completion experience (ConversationComplete → summary, rating, export,
 *   and the Phase 11 "Take Lesson Assessment" follow-up card) renders below
 *   the transcript. The learner then navigates away via the follow-up
 *   action cards (assessment / practice / dashboard).
 * Both buttons are disabled while the session is idle (before it starts).
 *
 * Phase 2 polish: refined hover/active/disabled states, smoother
 * transitions, and subtle shadow lifts — without changing the palette.
 *
 * Phase 3 Part 2:
 * - Restart and End now prompt a SweetAlert2 confirmation dialog before
 *   acting, preventing accidental data loss (Tasks 3 & 4). The dialogs are
 *   keyboard-accessible (Esc cancels, Enter confirms) and screen-reader
 *   friendly via the themed SweetAlert2 markup.
 */
export default function SessionControls() {
    const { status, restartSession, endSession, isLoading } = useConversation();

    const isIdle = status === "idle";
    // Disable controls while idle (pre-session) or while a backend request is in flight.
    const isDisabled = isIdle || isLoading;

    const handleRestart = async () => {
        const result = await showConfirmationAlert({
            title: "Restart Session?",
            text: "Your current conversation will be cleared.",
            confirmButtonText: "Restart",
            cancelButtonText: "Cancel",
        });
        if (result.isConfirmed) {
            restartSession();
        }
    };

    const handleEnd = async () => {
        const result = await showConfirmationAlert({
            title: "End Session?",
            text: "Your conversation will be saved and you can review it below.",
            confirmButtonText: "End Session",
            cancelButtonText: "Continue Session",
        });
        if (result.isConfirmed) {
            // Stay on the page so the completion experience (summary, rating,
            // export, and the Phase 11 "Take Lesson Assessment" follow-up card)
            // renders below the transcript. The learner navigates away via the
            // follow-up action cards (assessment / practice / dashboard).
            void endSession();
        }
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <button
                type="button"
                onClick={handleRestart}
                disabled={isDisabled}
                aria-label="Restart session"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
                <RotateCcw className="h-4 w-4" />
                Restart Session
            </button>
            <button
                type="button"
                onClick={handleEnd}
                disabled={isDisabled}
                aria-label="End session"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
                <LogOut className="h-4 w-4" />
                End Session
            </button>
        </div>
    );
}
