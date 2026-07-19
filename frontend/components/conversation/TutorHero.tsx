"use client";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useAvatarState } from "@/features/conversation/useAvatarState";
import {
    PRACTICE_WELCOME_MESSAGES,
    TUTOR_NAME,
    TUTOR_SUBTITLE,
} from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";
import AnimatedTutorAvatar from "./AnimatedTutorAvatar";

type TutorHeroProps = {
    /** Optional override for the welcome line (defaults to the practice-specific message). */
    welcomeMessage?: string;
};

/**
 * Per-state badge styling for the live status pill shown next to Emma's name.
 * Kept here (not in CSS) so the state → color mapping lives beside the
 * `useAvatarState` derivation that produces it.
 */
const STATE_BADGE: Record<
    ReturnType<typeof useAvatarState>["state"],
    { className: string; dot: string }
> = {
    idle: {
        className: "bg-emerald-500/20 text-emerald-300",
        dot: "bg-emerald-400",
    },
    listening: {
        className: "bg-rose-500/20 text-rose-300",
        dot: "bg-rose-400",
    },
    thinking: {
        className: "bg-amber-500/20 text-amber-300",
        dot: "bg-amber-400",
    },
    loading: {
        className: "bg-sky-500/20 text-sky-300",
        dot: "bg-sky-400",
    },
    speaking: {
        className: "bg-blue-500/25 text-blue-200",
        dot: "bg-blue-300",
    },
    paused: {
        className: "bg-slate-500/20 text-slate-300",
        dot: "bg-slate-400",
    },
    error: {
        className: "bg-red-500/20 text-red-300",
        dot: "bg-red-400",
    },
};

/**
 * AI Tutor hero banner.
 *
 * Phase M14 — now renders the animated `AnimatedTutorAvatar` whose mouth and
 * expression are speech-synchronized to the real TTS audio playback state
 * (via `useAvatarState`). A dynamic status badge next to Emma's name reflects
 * the current avatar state (Listening / Thinking / Speaking / Ready), and an
 * accessible `aria-live` region announces state transitions to screen readers.
 *
 * The hero keeps its original layout, gradient, decorative glows, and welcome
 * message so existing visual hierarchy is preserved — only the avatar becomes
 * animated and the static "Online" pill becomes a live status indicator.
 */
export default function TutorHero({ welcomeMessage }: TutorHeroProps) {
    const { practiceType } = useConversation();
    const { state, label } = useAvatarState();

    const message =
        welcomeMessage ??
        (practiceType
            ? PRACTICE_WELCOME_MESSAGES[practiceType as PracticeType]
            : "I'm here to help you practice English. Let's get started whenever you're ready.");

    const badge = STATE_BADGE[state];

    return (
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
            {/* Decorative glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl"
            />

            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                {/* Animated avatar — speech-synced via useAvatarState. */}
                <div className="relative flex-shrink-0">
                    <AnimatedTutorAvatar state={state} size="lg" />
                </div>

                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
                            {TUTOR_NAME}
                        </h1>
                        {/* Live status badge — color + label reflect avatar state. */}
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}
                            aria-hidden="true"
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${badge.dot} ${state === "speaking" || state === "listening" ? "animate-pulse" : ""}`}
                            />
                            {label}
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-blue-200">
                        {TUTOR_SUBTITLE}
                    </p>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                        {message}
                    </p>
                </div>
            </div>

            {/* Accessible live region — announces avatar state transitions
                politely to assistive technology. Visually hidden. */}
            <span className="sr-only" aria-live="polite" role="status">
                {label}
            </span>
        </section>
    );
}
