"use client";

import { Mic, Loader2, Volume2 } from "lucide-react";

/**
 * The four visual states of the voice microphone (Phase 11.5).
 *
 * - `idle`        — blue button, static, waiting for the user to start.
 * - `recording`   — red button with pulse, glow, and ripple animations.
 * - `processing`  — amber button with a spinning loader and scale breathing.
 * - `aiSpeaking`  — indigo button with a subtle pulse (Emma is "talking").
 */
export type VoiceState = "idle" | "recording" | "processing" | "aiSpeaking";

type MicrophoneButtonProps = {
    /** Current visual state of the microphone. */
    state: VoiceState;
    /** Fired when the button is clicked in an interactive state (idle/recording). */
    onClick?: () => void;
    /** Disables the button entirely (e.g. before the conversation starts). */
    disabled?: boolean;
    /** Accessible label announced by screen readers. */
    "aria-label"?: string;
};

type StateConfig = {
    icon: typeof Mic;
    baseClass: string;
    iconClass: string;
    animationClass: string;
    defaultLabel: string;
};

const STATE_CONFIG: Record<VoiceState, StateConfig> = {
    idle: {
        icon: Mic,
        baseClass: "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25",
        iconClass: "text-white",
        animationClass: "",
        defaultLabel: "Start voice recording",
    },
    recording: {
        icon: Mic,
        baseClass: "bg-red-500 shadow-lg shadow-red-500/30",
        iconClass: "text-white",
        animationClass: "spk-mic-glow",
        defaultLabel: "Stop recording",
    },
    processing: {
        icon: Loader2,
        baseClass: "bg-amber-500 shadow-lg shadow-amber-500/25",
        iconClass: "text-white animate-spin",
        animationClass: "spk-mic-scale",
        defaultLabel: "Processing your speech",
    },
    aiSpeaking: {
        icon: Volume2,
        baseClass: "bg-indigo-600 shadow-lg shadow-indigo-600/25",
        iconClass: "text-white",
        animationClass: "spk-avatar-pulse",
        defaultLabel: "Emma is speaking",
    },
};

/**
 * Large circular microphone button with four animated visual states.
 *
 * The button is only interactive in the `idle` and `recording` states.
 * In `processing` and `aiSpeaking` it is visually shown but disabled
 * so the user cannot interrupt the AI turn (transcription or TTS playback).
 *
 * Animations (pulse, glow, ripple, scale) are CSS-only and respect
 * `prefers-reduced-motion` via the global fallback in `globals.css`.
 */
export default function MicrophoneButton({
    state,
    onClick,
    disabled = false,
    "aria-label": ariaLabel,
}: MicrophoneButtonProps) {
    const config = STATE_CONFIG[state];
    const Icon = config.icon;
    const isRecording = state === "recording";
    const isInteractive = state === "idle" || state === "recording";
    const isDisabled = disabled || !isInteractive;

    return (
        <div className="relative flex items-center justify-center">
            {/* Ripple rings — only while recording */}
            {isRecording && (
                <>
                    <span
                        className="spk-mic-ripple pointer-events-none absolute h-20 w-20 rounded-full bg-red-400/25"
                        aria-hidden="true"
                    />
                    <span
                        className="spk-mic-ripple pointer-events-none absolute h-20 w-20 rounded-full bg-red-400/25"
                        aria-hidden="true"
                    />
                    <span
                        className="spk-mic-ripple pointer-events-none absolute h-20 w-20 rounded-full bg-red-400/25"
                        aria-hidden="true"
                    />
                </>
            )}

            <button
                type="button"
                onClick={isDisabled ? undefined : onClick}
                disabled={isDisabled}
                aria-label={ariaLabel ?? config.defaultLabel}
                aria-pressed={isRecording}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${config.baseClass} ${config.animationClass} ${isDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:scale-105"
                    }`}
            >
                <Icon className={`h-8 w-8 ${config.iconClass}`} aria-hidden="true" />
            </button>
        </div>
    );
}
