"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Home, LayoutGrid, RotateCcw } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";

/**
 * Follow-up action cards shown after the session is completed.
 *
 * Four cards (the assessment card only appears when a lesson was selected):
 *  1. "Take Assessment" — links to the lesson's quiz (Phase 11). Only shown
 *     when the conversation had a selected lesson (`lessonId` is set).
 *  2. "Practice Again" — restarts the current conversation.
 *  3. "Choose Another Practice" — navigates to /dashboard/practice.
 *  4. "Return to Dashboard" — navigates to /dashboard.
 *
 * Uses the existing dashboard card styling language (rounded cards, soft
 * shadows, hover lift) and is fully keyboard accessible.
 */
export default function FollowUpActions() {
    const { restartSession, lessonId } = useConversation();
    const router = useRouter();

    const actions = [
        {
            icon: RotateCcw,
            title: "Practice Again",
            description: "Restart this conversation with a fresh start.",
            accent: "text-blue-600",
            ring: "hover:border-blue-300 hover:bg-blue-50",
            onClick: restartSession,
        },
        {
            icon: LayoutGrid,
            title: "Choose Another Practice",
            description: "Pick a different skill to work on.",
            accent: "text-indigo-600",
            ring: "hover:border-indigo-300 hover:bg-indigo-50",
            onClick: () => router.push("/dashboard/practice"),
        },
        {
            icon: Home,
            title: "Return to Dashboard",
            description: "Go back to your learning dashboard.",
            accent: "text-emerald-600",
            ring: "hover:border-emerald-300 hover:bg-emerald-50",
            onClick: () => router.push("/dashboard"),
        },
    ];

    return (
        <div className="space-y-3">
            {/* Phase 11 — Take Assessment card (only when a lesson is selected). */}
            {lessonId && (
                <Link
                    href={`/dashboard/quiz?lesson=${encodeURIComponent(lessonId)}`}
                    className="group flex items-center gap-4 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                        <ClipboardCheck className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                        <span className="block text-sm font-extrabold text-slate-900">
                            Take the Lesson Assessment
                        </span>
                        <span className="block text-xs font-medium leading-relaxed text-slate-500">
                            Test what you learned and earn XP based on your score.
                        </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition group-hover:bg-blue-700">
                        Start Quiz
                    </span>
                </Link>
            )}

            <div
                className="grid gap-3 sm:grid-cols-3"
                role="group"
                aria-label="Next actions"
            >
                {actions.map(({ icon: Icon, title, description, accent, ring, onClick }) => (
                    <button
                        key={title}
                        type="button"
                        onClick={onClick}
                        aria-label={title}
                        className={`group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${ring}`}
                    >
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${accent}`}>
                            <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">
                            {title}
                        </span>
                        <span className="text-xs font-medium leading-relaxed text-slate-500">
                            {description}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
