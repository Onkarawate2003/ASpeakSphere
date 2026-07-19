"use client";

/**
 * Reusable branded AI tutor avatar.
 *
 * A circular avatar with a blue → indigo gradient, a white letter "E"
 * (for "Emma"), and a soft shadow. Used across the conversation module
 * (TutorHero, ChatBubble) and designed to be reused in future phases.
 *
 * The size is controlled via the `size` prop so the same component works
 * in the hero banner (large) and inside chat bubbles (small).
 *
 * Phase 4 — Voice Conversation UI:
 * When `isSpeaking` is true the avatar gains a glowing ring, a subtle
 * pulse animation, and a small "Speaking…" indicator dot. This is a
 * purely visual cue — no audio is played. The animations respect
 * `prefers-reduced-motion` via the global fallback in `globals.css`.
 */

type TutorAvatarSize = "sm" | "md" | "lg";

type TutorAvatarProps = {
    /** Visual size preset. Defaults to "md". */
    size?: TutorAvatarSize;
    /** Optional extra classes for fine-grained layout tweaks. */
    className?: string;
    /** Accessible label announced by screen readers. */
    "aria-label"?: string;
    /**
     * When true, the avatar glows and pulses to indicate Emma is
     * "speaking" (i.e. the simulated AI is composing a reply). Adds a
     * small "Speaking…" indicator beneath the avatar. Defaults to false
     * so existing usages are unaffected.
     */
    isSpeaking?: boolean;
};

const SIZE_CLASSES: Record<TutorAvatarSize, string> = {
    // Chat bubble avatar
    sm: "h-9 w-9 text-base",
    // Default / header avatar
    md: "h-12 w-12 text-lg",
    // Hero banner avatar
    lg: "h-20 w-20 text-3xl",
};

const SHADOW_CLASSES: Record<TutorAvatarSize, string> = {
    sm: "shadow-sm shadow-blue-900/20",
    md: "shadow-md shadow-blue-900/30",
    lg: "shadow-xl shadow-blue-900/40",
};

/** Glow ring classes applied when `isSpeaking` is true. */
const SPEAKING_RING_CLASS = "ring-4 ring-blue-400/50 spk-avatar-glow";
/** Pulse animation class applied to the avatar body when speaking. */
const SPEAKING_PULSE_CLASS = "spk-avatar-pulse";

export default function TutorAvatar({
    size = "md",
    className = "",
    "aria-label": ariaLabel = "Emma, AI English Coach",
    isSpeaking = false,
}: TutorAvatarProps) {
    return (
        <div className={`relative flex flex-shrink-0 flex-col items-center ${className}`}>
            <div
                aria-label={ariaLabel}
                role="img"
                aria-busy={isSpeaking ? true : undefined}
                className={`flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 font-extrabold leading-none text-white ring-1 ring-inset ring-white/20 ${SIZE_CLASSES[size]} ${SHADOW_CLASSES[size]} ${isSpeaking ? `${SPEAKING_RING_CLASS} ${SPEAKING_PULSE_CLASS}` : ""}`}
            >
                E
            </div>

            {/* "Speaking…" indicator — only while the AI is responding. */}
            {isSpeaking && (
                <span
                    className="mt-1.5 flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600"
                    aria-hidden="true"
                >
                    <span className="flex items-end gap-0.5">
                        <span className="spk-speaking-dot h-1 w-1 rounded-full bg-indigo-500" />
                        <span className="spk-speaking-dot h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="spk-speaking-dot h-1 w-1 rounded-full bg-indigo-500" />
                    </span>
                    Speaking…
                </span>
            )}
        </div>
    );
}
