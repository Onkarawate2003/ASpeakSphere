"use client";

import { useEffect, useRef, useState } from "react";
import { useConversation } from "@/features/conversation/ConversationContext";
import type { VoiceState } from "@/components/conversation/MicrophoneButton";

type SessionStatusProps = {
    /**
     * Current voice state, supplied by the VoiceConversationPanel.
     * When `recording` or `processing`, the badge reflects the voice flow
     * instead of the chat flow. Defaults to "idle" (chat-driven status).
     */
    voiceState?: VoiceState;
};

type StatusBadge = {
    label: string;
    /** Tailwind classes for the pill background + text color. */
    pillClass: string;
    /** Tailwind classes for the leading dot. */
    dotClass: string;
    /** Whether the dot should pulse. */
    pulse: boolean;
};

/**
 * Dynamic session-status badge.
 *
 * Reads the conversation lifecycle (`status`, `isTyping`, `isCompleted`)
 * from `ConversationContext` and combines it with the optional
 * `voiceState` to produce a single, always-current status pill:
 *
 *   - idle (no session)            → "Ready"
 *   - recording (voice)            → "Listening..."
 *   - processing (voice)           → "Processing..."
 *   - isTyping (Emma replying)     → "Emma is speaking..."
 *   - active, waiting for user     → "Waiting for your response"
 *   - ended / completed            → "Completed"
 *
 * The badge is announced to assistive tech via an `aria-live="polite"`
 * region (see the parent panel), so this component stays visual-only
 * with a hidden status text for screen readers.
 */
export default function SessionStatus({ voiceState = "idle" }: SessionStatusProps) {
    const { status, isTyping, isCompleted } = useConversation();

    const badge = resolveBadge(status, isTyping, isCompleted, voiceState);

    return (
        <div
            className="flex items-center gap-2"
            // Visual-only; the live region is owned by the parent panel.
            aria-hidden="true"
        >
            <span
                className={`h-2 w-2 rounded-full ${badge.dotClass} ${badge.pulse ? "animate-pulse" : ""}`}
            />
            <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${badge.pillClass}`}
            >
                {badge.label}
            </span>
        </div>
    );
}

/**
 * Resolve the current status badge from the conversation + voice state.
 *
 * Voice states take priority over chat states when active, because the
 * voice flow is the more immediate interaction. Otherwise the chat
 * lifecycle drives the badge.
 */
function resolveBadge(
    status: "idle" | "active" | "ended",
    isTyping: boolean,
    isCompleted: boolean,
    voiceState: VoiceState,
): StatusBadge {
    // Completed / ended always wins.
    if (status === "ended" || isCompleted) {
        return {
            label: "Completed",
            pillClass: "bg-emerald-50 text-emerald-700",
            dotClass: "bg-emerald-500",
            pulse: false,
        };
    }

    // Idle (no session started yet).
    if (status === "idle") {
        return {
            label: "Ready",
            pillClass: "bg-slate-100 text-slate-600",
            dotClass: "bg-slate-400",
            pulse: false,
        };
    }

    // Active session — voice states take priority.
    if (voiceState === "recording") {
        return {
            label: "Listening...",
            pillClass: "bg-red-50 text-red-700",
            dotClass: "bg-red-500",
            pulse: true,
        };
    }

    if (voiceState === "processing") {
        return {
            label: "Processing...",
            pillClass: "bg-amber-50 text-amber-700",
            dotClass: "bg-amber-500",
            pulse: true,
        };
    }

    if (voiceState === "aiSpeaking" || isTyping) {
        return {
            label: "Emma is speaking...",
            pillClass: "bg-indigo-50 text-indigo-700",
            dotClass: "bg-indigo-500",
            pulse: true,
        };
    }

    // Active, not typing, not recording → waiting for the user.
    return {
        label: "Waiting for your response",
        pillClass: "bg-blue-50 text-blue-700",
        dotClass: "bg-blue-500",
        pulse: false,
    };
}

/**
 * Hook that exposes the current status label as a plain string, for
 * components that need to announce it in an `aria-live` region without
 * rendering the visual badge. Kept here so the resolution logic lives
 * in a single place.
 */
export function useSessionStatusLabel(voiceState: VoiceState = "idle"): string {
    const { status, isTyping, isCompleted } = useConversation();
    // Re-resolve whenever any input changes; the result is cheap.
    const labelRef = useRef<string>("");
    const label = resolveBadge(status, isTyping, isCompleted, voiceState).label;
    labelRef.current = label;

    // Keep a stable reference so consumers can depend on the return value.
    const [stable, setStable] = useState<string>(label);
    useEffect(() => {
        setStable(label);
    }, [label]);

    return stable;
}
