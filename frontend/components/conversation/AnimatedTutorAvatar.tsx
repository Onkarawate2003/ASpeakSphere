"use client";

import { memo } from "react";

import type { AvatarState } from "@/features/conversation/useAvatarState";

/**
 * Phase M14 — AI Animated Avatar & Speech-Synchronized Conversation.
 *
 * `AnimatedTutorAvatar` is a pure-SVG + CSS animated female AI English tutor
 * ("Emma"). It replaces the static gradient circle in `TutorAvatar` with a
 * lightweight, dependency-free illustrated face whose animation profile is
 * driven entirely by the `state` prop (derived from `useAvatarState`).
 *
 * Design goals (from the Phase M14 spec):
 *  - **Always visible** during conversations (rendered in `TutorHero`).
 *  - **Speech-synchronized**: the mouth moves only while `state === "speaking"`
 *    (which is driven by the real HTMLAudioElement `playing` event, not a
 *    timer). When audio pauses → `paused` (mouth holds). When audio ends →
 *    `idle` (mouth closes, gentle breathing resumes). No looping after speech.
 *  - **State profiles**: idle (breathing + blinking), listening (attentive
 *    tilt), thinking (subtle look-up), loading (soft pulse), speaking (mouth
 *    + blink), paused (held), error (gentle shake).
 *  - **Performance**: inline SVG (~2 KB), no canvas/WebGL/JS animation loop,
 *    no new dependencies. Animations are GPU-friendly `transform`/`opacity`
 *    keyframes. The component is `memo`-ized so it only re-renders when the
 *    `state` prop changes.
 *  - **Accessibility**: the SVG is `aria-hidden` (decorative); the live
 *    status label is provided by the parent via a separate `aria-live`
 *    region. All animations respect `prefers-reduced-motion` (see the
 *    global fallback in `globals.css`).
 *  - **Future expansion**: the `variant` prop is reserved for multiple tutors
 *    (male tutor, premium avatars). Today only "emma" is rendered, but the
 *    prop keeps the public API stable for Phase M15+ avatar selection.
 */

type AvatarSize = "sm" | "md" | "lg";

type AnimatedTutorAvatarProps = {
    /** Animation state derived from `useAvatarState`. Defaults to "idle". */
    state?: AvatarState;
    /** Visual size preset (matches the legacy `TutorAvatar` sizes). */
    size?: AvatarSize;
    /** Reserved for future multi-tutor support. Defaults to "emma". */
    variant?: "emma";
    /** Optional extra classes for layout tweaks. */
    className?: string;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-24 w-24",
};

/**
 * Per-state class tokens applied to the SVG root. Each token maps to a set
 * of CSS keyframes defined in `globals.css` under the `spk-ava-*` namespace.
 * Keeping the mapping here (not in CSS) makes the state machine the single
 * source of truth for which animations run.
 */
const STATE_CLASS: Record<AvatarState, string> = {
    idle: "spk-ava-idle",
    listening: "spk-ava-listening",
    thinking: "spk-ava-thinking",
    loading: "spk-ava-loading",
    speaking: "spk-ava-speaking",
    paused: "spk-ava-paused",
    error: "spk-ava-error",
};

/**
 * Inline SVG illustration of Emma — a friendly female AI tutor face.
 *
 * The SVG is intentionally simple (geometric shapes, no external assets) so
 * it scales crisply at every size and adds ~2 KB to the bundle. Sub-groups
 * are given stable `id`s so CSS keyframes can target them for animation:
 *
 *  - `#ava-head`     — the whole head (breathing scale + sway).
 *  - `#ava-eyes`     — both eyes (blink via scaleY).
 *  - `#ava-mouth`    — the mouth (talk via scaleY open/close).
 *  - `#ava-brows`    — eyebrows (attentive raise while listening).
 *  - `#ava-glow`     — the outer halo ring (intensity per state).
 *
 * `currentColor` is used for strokes so the avatar inherits the surrounding
 * text color, keeping it themeable.
 */
function EmmaFace() {
    return (
        <svg
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
            aria-hidden="true"
            focusable="false"
        >
            {/* Outer halo — intensity animated per state via #ava-glow */}
            <circle
                id="ava-glow"
                cx="60"
                cy="60"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="spk-ava-glow-ring"
                opacity="0.35"
            />

            {/* Head group — breathing + sway target */}
            <g id="ava-head">
                {/* Hair back (behind face) */}
                <path
                    d="M22 64c0-22 17-38 38-38s38 16 38 38c0 6-1 11-3 16-3-10-10-17-19-20-3-1-6 0-9 1-2-7-7-12-14-12-9 0-16 7-16 16 0 3 1 5 2 7-9-1-15-8-17-16z"
                    fill="currentColor"
                    opacity="0.85"
                />
                {/* Face */}
                <circle cx="60" cy="62" r="30" fill="#FFF7F0" />
                {/* Cheeks */}
                <circle cx="44" cy="70" r="5" fill="#FBCFE8" opacity="0.7" />
                <circle cx="76" cy="70" r="5" fill="#FBCFE8" opacity="0.7" />

                {/* Hair front fringe */}
                <path
                    d="M30 56c2-14 14-22 30-22s28 8 30 22c-4-6-10-9-16-9-4 3-9 4-14 4s-10-1-14-4c-6 0-12 3-16 9z"
                    fill="currentColor"
                    opacity="0.9"
                />

                {/* Brows — attentive raise while listening (#ava-brows) */}
                <g id="ava-brows" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M44 56c4-3 9-3 12 0" />
                    <path d="M64 56c3-3 8-3 12 0" />
                </g>

                {/* Eyes — blink target (#ava-eyes) */}
                <g id="ava-eyes" fill="currentColor">
                    <ellipse cx="50" cy="63" rx="3.2" ry="4" />
                    <ellipse cx="70" cy="63" rx="3.2" ry="4" />
                    {/* Eye shine */}
                    <circle cx="51" cy="61.5" r="1" fill="#fff" />
                    <circle cx="71" cy="61.5" r="1" fill="#fff" />
                </g>

                {/* Nose */}
                <path
                    d="M60 66c-1 3-2 5-1 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.5"
                />

                {/* Mouth — talk target (#ava-mouth) */}
                <g id="ava-mouth">
                    {/* Default gentle smile (closed mouth) */}
                    <path
                        d="M52 78c3 3 13 3 16 0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="spk-ava-mouth-closed"
                    />
                    {/* Open mouth overlay — revealed while speaking via opacity */}
                    <ellipse
                        cx="60"
                        cy="79"
                        rx="6"
                        ry="4"
                        fill="#7C2D12"
                        className="spk-ava-mouth-open"
                        opacity="0"
                    />
                </g>
            </g>
        </svg>
    );
}

/**
 * Animated female AI tutor avatar.
 *
 * Renders the `EmmaFace` SVG inside a circular gradient container and applies
 * the state-driven animation class. The container keeps the same gradient
 * + ring styling as the legacy `TutorAvatar` so existing layouts are
 * unaffected; only the inner content becomes animated.
 */
function AnimatedTutorAvatarInner({
    state = "idle",
    size = "md",
    variant = "emma",
    className = "",
}: AnimatedTutorAvatarProps) {
    // variant is reserved for future tutors; today it only selects Emma.
    void variant;

    return (
        <div
            className={`relative flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white ring-1 ring-inset ring-white/20 ${SIZE_CLASSES[size]} ${className}`}
        >
            <div
                className={`flex h-full w-full items-center justify-center rounded-full ${STATE_CLASS[state]}`}
                style={{ color: "#E0E7FF" }}
            >
                <EmmaFace />
            </div>
        </div>
    );
}

/**
 * Memoized export — the avatar only re-renders when `state`, `size`,
 * `variant`, or `className` change. Since `state` is a short string that
 * only transitions on real audio/conversation events, this keeps re-renders
 * to the absolute minimum (Part 8 — avoid unnecessary re-renders).
 */
const AnimatedTutorAvatar = memo(AnimatedTutorAvatarInner);

export default AnimatedTutorAvatar;
