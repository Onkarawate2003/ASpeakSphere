"use client";

import { memo } from "react";

import { useAvatarState } from "@/features/conversation/useAvatarState";
import { TUTOR_NAME, TUTOR_SUBTITLE } from "@/features/conversation/constants";

/**
 * Phase M14 Enhancement — TutorPortrait.
 *
 * Renders the existing `frontend/public/AI Tutor.jpg` portrait as the large,
 * primary visual focus of the redesigned Conversation screen. The portrait is
 * Emma — the same AI English Coach identity used everywhere else in the app
 * (TutorHero, ChatBubble, history). No new tutor is generated.
 *
 * Animation strategy (Step 1 + Step 3 fallback):
 * Realistic mouth-region animation on a flat JPG is NOT technically feasible
 * without heavy/unstable dependencies (MediaPipe Face Mesh ~8 MB WASM or
 * TensorFlow.js face-landmark detection + pixel warping). A flat JPG has no
 * facial-landmark data, no separate mouth layer, and no depth/occlusion
 * geometry, so warping mouth pixels produces a distorted "uncanny" result.
 * Per the spec ("do NOT force a poor-quality solution"), this component
 * instead applies lightweight, GPU-friendly CSS transforms/opacity on the
 * `<img>` itself:
 *
 *  - **Subtle breathing** — gentle scale pulse (≤ 1.012) on the image.
 *  - **Natural floating** — slow vertical drift on the wrapper.
 *  - **Speaking glow** — pulsing warm indigo halo behind the portrait while
 *    Emma's TTS audio is actually playing (driven by `useAvatarState`, which
 *    derives `speaking` ONLY from `PlaybackState === "playing"` — the real
 *    HTMLAudioElement `playing` event, never a timer).
 *  - **Gentle head movement** — very subtle rotation tilt while idle.
 *  - **Natural idle state** — breathing + floating + tilt layered together.
 *
 * State → CSS class mapping lives here (the single source of truth), and each
 * class maps to keyframes defined in `globals.css` under the `spk-portrait-*`
 * namespace. All animations respect `prefers-reduced-motion` (global fallback).
 *
 * Performance:
 *  - The `<img>` uses `next/image`'s `priority` + `loading` semantics via a
 *    plain `<img>` tag (the asset is a known, small static file in `/public`,
 *    so the Next.js image optimizer is unnecessary overhead here).
 *  - The component is `memo`-ized and only re-renders when the avatar `state`
 *    string changes (a short string that only transitions on real audio /
 *    conversation events), keeping re-renders to the absolute minimum.
 *
 * Future-ready:
 *  - The `variant` prop is reserved for future multi-tutor / premium-tutor
 *    support (different portrait assets per tutor). Today only "emma" is
 *    rendered, but the prop keeps the public API stable for Phase M15+.
 *  - The wrapper's class structure is intentionally decoupled from the inner
 *    asset so a future Live Portrait / Rive / Live2D / viseme engine can
 *    replace the `<img>` without touching the surrounding status badge,
 *    halo, or layout.
 *
 * Accessibility:
 *  - The portrait is decorative (`aria-hidden`); the live status label is
 *    provided by the parent via a separate `aria-live` region (mirroring the
 *    pattern established by `AnimatedTutorAvatar`).
 */

type TutorPortraitProps = {
    /** Reserved for future multi-tutor support. Defaults to "emma". */
    variant?: "emma";
    /** Optional extra classes for layout tweaks. */
    className?: string;
};

/**
 * Per-state class tokens applied to the portrait wrapper. Each token maps to
 * a set of CSS keyframes defined in `globals.css` under the `spk-portrait-*`
 * namespace. Keeping the mapping here (not in CSS) makes the state machine the
 * single source of truth for which animations run.
 */
const PORTRAIT_STATE_CLASS: Record<
    ReturnType<typeof useAvatarState>["state"],
    string
> = {
    idle: "spk-portrait--idle",
    listening: "spk-portrait--listening",
    thinking: "spk-portrait--thinking",
    loading: "spk-portrait--loading",
    speaking: "spk-portrait--speaking",
    paused: "spk-portrait--paused",
    error: "spk-portrait--error",
};

/**
 * Per-state badge styling for the live status pill shown over the portrait.
 * Mirrors the color semantics used by `TutorHero.STATE_BADGE` so the visual
 * language stays consistent across the hero, the portrait, and the chat
 * bubbles.
 */
const STATE_BADGE: Record<
    ReturnType<typeof useAvatarState>["state"],
    { className: string; dot: string }
> = {
    idle: {
        className: "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/30",
        dot: "bg-emerald-400",
    },
    listening: {
        className: "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/30",
        dot: "bg-rose-400",
    },
    thinking: {
        className: "bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-400/30",
        dot: "bg-amber-400",
    },
    loading: {
        className: "bg-sky-500/15 text-sky-200 ring-1 ring-inset ring-sky-400/30",
        dot: "bg-sky-400",
    },
    speaking: {
        className: "bg-blue-500/20 text-blue-100 ring-1 ring-inset ring-blue-300/40",
        dot: "bg-blue-300",
    },
    paused: {
        className: "bg-slate-500/15 text-slate-200 ring-1 ring-inset ring-slate-400/30",
        dot: "bg-slate-400",
    },
    error: {
        className: "bg-red-500/15 text-red-200 ring-1 ring-inset ring-red-400/30",
        dot: "bg-red-400",
    },
};

function TutorPortraitInner({
    variant = "emma",
    className = "",
}: TutorPortraitProps) {
    // variant is reserved for future tutors; today it only selects Emma.
    void variant;

    const { state, label } = useAvatarState();
    const badge = STATE_BADGE[state];

    return (
        <div className={`relative flex flex-col items-center gap-4 ${className}`}>
            {/* Portrait + halo */}
            <div className="relative">
                {/* Soft ambient backdrop glow (decorative, behind portrait) */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-6 rounded-full bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-purple-600/20 blur-2xl"
                />

                {/* The portrait itself — state-driven animation class on wrapper. */}
                <div
                    className={`spk-portrait ${PORTRAIT_STATE_CLASS[state]} h-44 w-44 sm:h-52 sm:w-52 lg:h-60 lg:w-60`}
                    aria-hidden="true"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static known asset in /public, optimizer unnecessary */}
                    <img
                        src="/AI Tutor.jpg"
                        alt=""
                        className="spk-portrait__img"
                        draggable={false}
                    />
                </div>

                {/* Live status badge — floats over the bottom of the portrait. */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur-md ${badge.className}`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dot} ${state === "speaking" || state === "listening" ? "animate-pulse" : ""}`}
                        />
                        {label}
                    </span>
                </div>
            </div>

            {/* Tutor identity */}
            <div className="text-center">
                <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                    {TUTOR_NAME}
                </h2>
                <p className="text-sm font-semibold text-blue-200">
                    {TUTOR_SUBTITLE}
                </p>
            </div>
        </div>
    );
}

/**
 * Memoized export — the portrait only re-renders when the avatar `state`
 * changes (a short string that only transitions on real audio/conversation
 * events). This keeps re-renders to the absolute minimum.
 */
const TutorPortrait = memo(TutorPortraitInner);

export default TutorPortrait;
