"use client";

import {
    Clock,
    MessageSquare,
    Bot,
    User,
    CheckCircle2,
    CalendarClock,
    Flag,
    PlayCircle,
} from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import {
    calculateProgress,
    countByRole,
    formatSessionDateTime,
    formatTimer,
} from "@/features/conversation/utils";

/**
 * Conversation statistics breakdown.
 *
 * Displays the practice type, session duration, user message count, AI
 * message count, total messages, completion percentage, and the real
 * started/ended times. All values are read directly from
 * ConversationContext — no duplicated state, nothing hardcoded.
 *
 * Phase 10.5 — added Total Messages, Started and Ended time stats so the
 * history review surfaces the full dynamic picture of the session.
 *
 * Shown inside the session summary once the practice is completed.
 */
export default function ConversationStats() {
    const {
        practiceLabel,
        messages,
        elapsedSeconds,
        isCompleted,
        status,
        startedAt,
        endedAt,
    } = useConversation();

    const completed = isCompleted || status === "ended";
    const { user, ai } = countByRole(messages);
    const percent = calculateProgress(messages.length, completed);
    const total = user + ai;

    const stats = [
        {
            icon: Clock,
            label: "Duration",
            value: formatTimer(elapsedSeconds),
            accent: "text-blue-600",
        },
        {
            icon: User,
            label: "User Messages",
            value: String(user),
            accent: "text-indigo-600",
        },
        {
            icon: Bot,
            label: "AI Messages",
            value: String(ai),
            accent: "text-sky-600",
        },
        {
            icon: MessageSquare,
            label: "Total Messages",
            value: String(total),
            accent: "text-violet-600",
        },
        {
            icon: CheckCircle2,
            label: "Completion",
            value: `${percent}%`,
            accent: "text-emerald-600",
        },
        {
            icon: PlayCircle,
            label: "Started",
            value: formatSessionDateTime(startedAt),
            accent: "text-blue-600",
        },
        {
            icon: Flag,
            label: "Ended",
            value: formatSessionDateTime(endedAt),
            accent: "text-emerald-600",
        },
        {
            icon: CalendarClock,
            label: "Practice Mode",
            value: practiceLabel,
            accent: "text-blue-600",
        },
    ];

    return (
        <div
            className="grid grid-cols-2 gap-3"
            role="group"
            aria-label="Conversation statistics"
        >
            {stats.map(({ icon: Icon, label, value, accent }) => (
                <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                >
                    <span className={`flex-shrink-0 ${accent}`}>
                        <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {label}
                        </p>
                        <p className="truncate text-sm font-extrabold text-slate-800">
                            {value}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
