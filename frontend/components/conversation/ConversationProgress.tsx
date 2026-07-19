"use client";

import { CheckCircle2 } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { formatTimer, calculateProgress, getSessionStatusLabel } from "@/features/conversation/utils";

/**
 * Small progress card shown in the sidebar.
 *
 * Phase 2 polish:
 * - Progress is now calculated from the number of exchanged messages
 *   (frontend-only state) using the mapping in `calculateProgress`:
 *     0 → 0%, 1 → 8%, 3 → 20%, 5 → 35%, 8 → 55%, 12 → 80%, completed → 100%.
 * - The status label adapts to the current progress:
 *     Ready → Conversation Started → Practicing → Almost Complete → Completed.
 *
 * Phase 3:
 * - Reads `isCompleted` from the context so the bar jumps to 100% and the
 *   label reads "Completed" the moment the practice finishes.
 */
export default function ConversationProgress() {
    const { status, elapsedSeconds, messages, isCompleted } = useConversation();

    const completed = isCompleted || status === "ended";
    const percent = calculateProgress(messages.length, completed);
    const label = getSessionStatusLabel(status, percent);
    const isActive = status === "active";

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2
                        className={`h-4 w-4 ${isActive || completed ? "text-blue-600" : "text-slate-400"
                            }`}
                    />
                    <span className="text-sm font-bold text-slate-700">
                        {label}
                    </span>
                </div>
                <span className="text-sm font-extrabold text-blue-600">
                    {percent}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                />
            </div>

            <p className="mt-3 text-xs font-medium text-slate-500">
                Elapsed: <span className="font-bold text-slate-700">{formatTimer(elapsedSeconds)}</span>
            </p>
        </div>
    );
}
