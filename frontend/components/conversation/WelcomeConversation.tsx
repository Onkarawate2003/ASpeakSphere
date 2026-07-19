"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import {
    START_CONVERSATION_LABEL,
    SUGGESTED_PROMPTS,
    WELCOME_BODY,
    WELCOME_HEADLINE,
} from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";
import AnimatedTutorAvatar from "./AnimatedTutorAvatar";

/**
 * Initial welcome state shown before the session starts.
 * Displays a headline, body copy, a large "Start Conversation" button,
 * and a set of suggested prompt chips tailored to the selected practice
 * mode. Once the session is active, this component renders nothing.
 *
 * Phase 3:
 * - Suggested prompt chips (per practice mode) appear below the welcome
 *   copy. Clicking a chip starts the session AND immediately sends that
 *   prompt as the first user message via `startWithPrompt`, so the learner
 *   can begin practicing with a single click.
 * - All interactive elements carry aria-labels for screen readers.
 */
export default function WelcomeConversation() {
    const { status, practiceType, startSession, startWithPrompt } =
        useConversation();

    if (status !== "idle") {
        return null;
    }

    const suggestions =
        practiceType != null ? SUGGESTED_PROMPTS[practiceType as PracticeType] : [];

    return (
        <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            {/* Branded avatar badge */}
            <div className="relative">
                {/* Phase M14 — animated avatar (idle breathing) before the
                    session starts, so Emma feels alive on the welcome screen. */}
                <AnimatedTutorAvatar state="idle" size="lg" />
                <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md"
                >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                </span>
            </div>

            {/* Copy */}
            <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-3xl">
                    {WELCOME_HEADLINE}
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    {WELCOME_BODY}
                </p>
            </div>

            {/* Start button */}
            <button
                type="button"
                onClick={startSession}
                aria-label="Start conversation with Emma"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:translate-y-0 active:scale-95"
            >
                <MessageCircle className="h-5 w-5" />
                {START_CONVERSATION_LABEL}
            </button>

            {/* Suggested prompt chips — one click starts + sends the prompt. */}
            {suggestions.length > 0 && (
                <div className="mt-2 w-full max-w-lg">
                    <p
                        id="suggested-prompts-label"
                        className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                        Try one of these to begin
                    </p>
                    <div
                        className="flex flex-wrap items-center justify-center gap-2"
                        role="group"
                        aria-labelledby="suggested-prompts-label"
                    >
                        {suggestions.map((prompt) => (
                            <button
                                key={prompt}
                                type="button"
                                onClick={() => startWithPrompt(prompt)}
                                aria-label={`Start conversation with the prompt: ${prompt}`}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 active:scale-95"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
