"use client";

import AnimatedTutorAvatar from "./AnimatedTutorAvatar";
import { TUTOR_NAME } from "@/features/conversation/constants";

/**
 * Reusable "Emma is typing..." indicator.
 *
 * Shown inside the ChatWindow while the simulated AI engine is composing
 * a reply. Mirrors the AI chat-bubble layout (small TutorAvatar + white
 * card) so the typing state feels like a natural part of the transcript.
 *
 * The three animated dots are driven by the `spk-typing-dot` keyframe
 * defined in `globals.css`, with staggered delays so they bounce in
 * sequence. The animation is disabled under `prefers-reduced-motion`.
 */
export default function TypingIndicator() {
    return (
        <div
            className="spk-bubble-enter flex w-full items-end justify-start gap-2.5 sm:gap-3"
            role="status"
            aria-live="polite"
            aria-label={`${TUTOR_NAME} is typing`}
        >
            {/* Phase M14 — animated avatar in the "thinking" state:
                subtle look-up + slow blink while Emma composes a reply. */}
            <AnimatedTutorAvatar state="thinking" size="sm" />

            <div className="flex max-w-[75%] flex-col items-start gap-1">
                <div className="rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-blue-600">
                        {TUTOR_NAME}
                    </p>
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                        <span className="spk-typing-dot h-2 w-2 rounded-full bg-slate-400" />
                        <span className="spk-typing-dot h-2 w-2 rounded-full bg-slate-400" />
                        <span className="spk-typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    </div>
                </div>
                <span className="px-1 text-[11px] font-medium text-slate-400">
                    typing…
                </span>
            </div>
        </div>
    );
}
