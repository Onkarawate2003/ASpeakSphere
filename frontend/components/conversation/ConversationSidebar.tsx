"use client";

import { BookOpen, Lightbulb, Target, TrendingUp } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import {
    CONVERSATION_TIPS,
    CURRENT_LEVEL_LABEL,
    TODAY_GOAL_LABEL,
} from "@/features/conversation/constants";
import ConversationProgress from "./ConversationProgress";

/**
 * Sidebar shown alongside the chat window.
 * Contains: selected practice mode, today's goal, current level,
 * conversation tips, and the progress card.
 * On mobile it stacks below the chat area.
 */
export default function ConversationSidebar() {
    const { practiceLabel } = useConversation();

    return (
        <aside className="space-y-5">
            {/* Selected practice mode */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-700">
                        Practice Mode
                    </h3>
                </div>
                <p className="mt-2 text-base font-extrabold tracking-tight text-slate-900">
                    {practiceLabel}
                </p>
            </section>

            {/* Today's goal */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-700">
                        Today's Goal
                    </h3>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">
                    {TODAY_GOAL_LABEL}
                </p>
            </section>

            {/* Current level */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-700">
                        Current Level
                    </h3>
                </div>
                <p className="mt-2 text-sm font-extrabold text-slate-900">
                    {CURRENT_LEVEL_LABEL}
                </p>
            </section>

            {/* Conversation tips */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-700">
                        Conversation Tips
                    </h3>
                </div>
                <ul className="mt-3 space-y-2.5">
                    {CONVERSATION_TIPS.map((tip) => (
                        <li
                            key={tip}
                            className="flex items-start gap-2 text-sm text-slate-600"
                        >
                            <span
                                aria-hidden="true"
                                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                            />
                            <span className="leading-relaxed">{tip}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Progress */}
            <ConversationProgress />
        </aside>
    );
}
