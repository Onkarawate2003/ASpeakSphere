"use client";

import { memo } from "react";
import { Mic, Loader2, Volume2, Square } from "lucide-react";

import { useVoice } from "@/features/conversation/VoiceContext";
import type { VoiceState } from "@/components/conversation/MicrophoneButton";
import { formatTimer } from "@/features/conversation/utils";

/**
 * Phase M14 Enhancement — PremiumMicrophone.
 *
 * A large, floating microphone that is the **primary interaction element** at
 * the bottom of the redesigned Conversation screen. It reuses the existing
 * `useVoice()` API — the single shared recording state machine in
 * `VoiceContext` — so there is exactly one recorder for the whole app (no
 * duplicate logic). The same `handleMicClick` is shared with the compact mic
 * in `ConversationInput` and the sidebar `VoiceConversationPanel`.
 *
 * Visual states (driven by `voiceState`, NOT timers):
 *  - **idle**       — soft indigo glow that breathes gently. Click → start
 *                     recording.
 *  - **recording**  — red expanding ripple rings + inner pulse. Click → stop
 *                     and transcribe via Groq Whisper.
 *  - **processing**  — amber, spinning loader (STT in flight). Disabled.
 *  - **aiSpeaking** — muted grey glow (Emma is talking). Disabled — the user
 *                     cannot interrupt the AI turn. This enforces the
 *                     "disable recording while AI is talking" rule that is
 *                     already guaranteed by `VoiceContext.startRecording`
 *                     (it early-returns when `isTyping` is true), but the
 *                     button also visually reflects it.
 *
 * Animations are CSS-only (keyframes in `globals.css` under the `spk-pmic-*`
 * namespace) and respect `prefers-reduced-motion` via the global fallback.
 *
 * Performance:
 *  - `memo`-ized; only re-renders when `voiceState`, `recorderSeconds`,
 *    `isRecorderSupported`, or `handleMicClick` change. The voice API
 *    functions are stable (memoized in `VoiceContext`), so re-renders are
 *    minimal.
 *
 * Accessibility:
 *  - The button has a descriptive `aria-label` per state.
 *  - `aria-pressed` reflects the recording state.
 *  - A visually-hidden live region announces the current voice state for
 *    screen readers.
 *  - When the browser does not support audio recording, the button is
 *    disabled and labelled accordingly.
 */

type PremiumMicrophoneProps = {
    /** Optional extra classes for layout tweaks. */
    className?: string;
};

/**
 * Per-state configuration: icon, base colour, animation class, label, and
 * whether the button is interactive in that state.
 */
type StateConfig = {
    icon: typeof Mic;
    baseClass: string;
    iconClass: string;
    animationClass: string;
    label: string;
    interactive: boolean;
};

const STATE_CONFIG: Record<VoiceState, StateConfig> = {
    idle: {
        icon: Mic,
        baseClass: "bg-gradient-to-br from-blue-600 to-indigo-700",
        iconClass: "text-white",
        animationClass: "spk-pmic--idle",
        label: "Start voice recording",
        interactive: true,
    },
    recording: {
        icon: Square,
        baseClass: "bg-gradient-to-br from-red-500 to-rose-600",
        iconClass: "text-white",
        animationClass: "spk-pmic--recording",
        label: "Stop recording and send",
        interactive: true,
    },
    processing: {
        icon: Loader2,
        baseClass: "bg-gradient-to-br from-amber-500 to-orange-600",
        iconClass: "text-white animate-spin",
        animationClass: "spk-pmic--listening",
        label: "Processing your speech",
        interactive: false,
    },
    aiSpeaking: {
        icon: Volume2,
        baseClass: "bg-gradient-to-br from-slate-500 to-slate-600",
        iconClass: "text-white",
        animationClass: "spk-pmic--speaking",
        label: "Emma is speaking — please wait",
        interactive: false,
    },
};

function PremiumMicrophoneInner({ className = "" }: PremiumMicrophoneProps) {
    const { voiceState, handleMicClick, recorderSeconds, isRecorderSupported } =
        useVoice();

    const config = STATE_CONFIG[voiceState];
    const Icon = config.icon;
    const isRecording = voiceState === "recording";
    const isDisabled = !isRecorderSupported || !config.interactive;

    return (
        <div
            className={`flex flex-col items-center gap-3 ${className}`}
        >
            {/* Microphone button + ripple rings */}
            <div className="relative flex items-center justify-center">
                {/* Extra expanding ripple rings while recording — layered for
                    a richer "sonar" effect. Purely decorative. */}
                {isRecording && (
                    <>
                        <span
                            className="pointer-events-none absolute h-24 w-24 rounded-full bg-red-400/20"
                            aria-hidden="true"
                            style={{ animation: "spk-mic-ripple 1.4s ease-out infinite" }}
                        />
                        <span
                            className="pointer-events-none absolute h-24 w-24 rounded-full bg-red-400/15"
                            aria-hidden="true"
                            style={{ animation: "spk-mic-ripple 1.4s ease-out infinite 0.45s" }}
                        />
                    </>
                )}

                <button
                    type="button"
                    onClick={isDisabled ? undefined : handleMicClick}
                    disabled={isDisabled}
                    aria-label={config.label}
                    aria-pressed={isRecording}
                    className={`spk-pmic ${config.animationClass} relative flex h-24 w-24 items-center justify-center rounded-full ${config.baseClass} ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-105"}`}
                >
                    <Icon
                        className={`spk-pmic__icon h-9 w-9 ${config.iconClass}`}
                        aria-hidden="true"
                    />
                </button>
            </div>

            {/* State label + recording timer */}
            <div className="flex h-6 items-center gap-2 text-center">
                {isRecording ? (
                    <span
                        className="font-mono text-sm font-bold tabular-nums text-red-600"
                        role="timer"
                        aria-live="polite"
                        aria-label={`Recording, ${formatTimer(recorderSeconds)} elapsed`}
                    >
                        {formatTimer(recorderSeconds)}
                    </span>
                ) : (
                    <span className="text-sm font-semibold text-slate-500">
                        {isRecorderSupported ? config.label : "Voice mode unavailable"}
                    </span>
                )}
            </div>

            {/* Accessible live region — announces voice state transitions. */}
            <span className="sr-only" aria-live="polite" role="status">
                {config.label}
            </span>
        </div>
    );
}

/**
 * Memoized export — the mic only re-renders when `voiceState`,
 * `recorderSeconds`, `isRecorderSupported`, or `handleMicClick` change.
 */
const PremiumMicrophone = memo(PremiumMicrophoneInner);

export default PremiumMicrophone;
