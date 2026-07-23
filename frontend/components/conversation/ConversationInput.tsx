"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Mic, SendHorizontal, Square, Volume2 } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { useVoice } from "@/features/conversation/VoiceContext";
import {
    DEFAULT_INPUT_PLACEHOLDER,
    PRACTICE_INPUT_PLACEHOLDERS,
} from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";
import type { VoiceState } from "@/components/conversation/MicrophoneButton";
import VoiceWaveform from "@/components/conversation/VoiceWaveform";

/**
 * Per-voice-state mic button styling. Mirrors the state → visual mapping
 * that used to live in the standalone `PremiumMicrophone` component (icon,
 * color, interactivity per state) — the mapping moved here, the underlying
 * `useVoice()` state it reads did not change at all.
 */
type MicStateConfig = {
    icon: typeof Mic;
    baseClass: string;
    iconClass: string;
    label: string;
    /** Whether the button is clickable in this state. */
    interactive: boolean;
};

const MIC_STATE_CONFIG: Record<VoiceState, MicStateConfig> = {
    idle: {
        icon: Mic,
        baseClass: "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25",
        iconClass: "text-white",
        label: "Start voice recording",
        interactive: true,
    },
    recording: {
        icon: Square,
        baseClass: "bg-red-500 shadow-md shadow-red-500/30",
        iconClass: "text-white fill-current",
        label: "Stop recording and send",
        interactive: true,
    },
    processing: {
        icon: Loader2,
        baseClass: "bg-amber-500 shadow-md shadow-amber-500/25",
        iconClass: "text-white animate-spin",
        label: "Processing your speech",
        interactive: false,
    },
    aiSpeaking: {
        icon: Volume2,
        baseClass: "bg-slate-400",
        iconClass: "text-white",
        label: "Emma is speaking — please wait",
        interactive: false,
    },
};

/**
 * Single interaction bar — Phase 3 Voice Interaction Redesign.
 *
 * This bar is now the ONLY interaction area for the conversation: typing
 * and voice both live here. It replaces the previous split between a
 * standalone `PremiumMicrophone` section and this text-only input.
 *
 * Three visual states, driven entirely by the existing `voiceState` from
 * `useVoice()` — no new state, no changed business logic:
 *
 *  - idle / aiSpeaking → mic button + textarea + send button (unchanged
 *    typing behaviour; the mic button's color/interactivity reflects
 *    whichever of the two states is active).
 *  - recording         → mic button (now acting as "stop") + VoiceWaveform
 *                        + "Listening..." IN PLACE OF the textarea. The
 *                        send button is hidden — there is nothing to send
 *                        by hand while recording.
 *  - processing        → the whole bar becomes a single "Processing your
 *                        speech..." status line, matching the approved
 *                        target design.
 *
 * Voice pipeline (UNCHANGED — this is a presentation-only relocation):
 * tapping the mic calls the exact same `handleMicClick` from `VoiceContext`
 * that `PremiumMicrophone` used to call. Recording → transcription →
 * `sendMessage(transcript)` all happen inside `VoiceContext`, exactly as
 * before. The recognized transcript is NEVER assigned to this component's
 * `value` state — there is no code path here that touches `value` from the
 * voice flow, so the automatic-send behaviour is preserved exactly.
 *
 * Typing (UNCHANGED): Enter sends, Shift+Enter inserts a newline, empty/
 * whitespace messages are blocked, the textarea auto-resizes and clears
 * after sending — none of this logic changed.
 *
 * Accessibility: the mic button carries a per-state `aria-label` (mirroring
 * `PremiumMicrophone`'s previous labels), and a `useEffect` restores focus
 * to the mic button if it was lost when the recording/processing UI
 * unmounted the textarea (see `wasBusyRef` below) — the only new logic in
 * this file exists to prevent a focus-loss regression, not to change any
 * conversation/voice behaviour.
 */
export default function ConversationInput() {
    const { sendMessage, status, practiceType, isTyping, isCompleted, isLoading } =
        useConversation();
    const { voiceState, handleMicClick, isRecorderSupported } = useVoice();
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const micButtonRef = useRef<HTMLButtonElement | null>(null);

    const isActive = status === "active";
    // Block sending while Emma is typing, the session is completed, or a backend request is in flight.
    const isLocked = isTyping || isCompleted || isLoading;
    const canSend = isActive && !isLocked && value.trim().length > 0;

    const isRecording = voiceState === "recording";
    const isProcessing = voiceState === "processing";
    const micConfig = MIC_STATE_CONFIG[voiceState];
    const MicIcon = micConfig.icon;
    const micDisabled =
        !isActive || isLocked || !isRecorderSupported || !micConfig.interactive;

    const placeholder = !isActive
        ? DEFAULT_INPUT_PLACEHOLDER
        : isCompleted
            ? "Practice completed — start a new session to continue."
            : isTyping
                ? "Emma is typing…"
                : practiceType
                    ? PRACTICE_INPUT_PLACEHOLDERS[practiceType as PracticeType]
                    : DEFAULT_INPUT_PLACEHOLDER;

    // Accessibility safeguard: the textarea (and, during processing, the mic
    // button too) unmount while recording/processing. If a screen reader or
    // keyboard user had focus on one of those elements, unmounting drops
    // focus to <body>. When we return to idle, restore focus to the mic
    // button (which is always present in the idle/aiSpeaking layout) rather
    // than leaving focus lost. This does not change any voice/recording
    // behaviour — it only restores where keyboard focus lands.
    const wasBusyRef = useRef(false);
    useEffect(() => {
        const isBusy = isRecording || isProcessing;
        if (wasBusyRef.current && !isBusy) {
            if (
                typeof document !== "undefined" &&
                document.activeElement === document.body
            ) {
                micButtonRef.current?.focus();
            }
        }
        wasBusyRef.current = isBusy;
    }, [isRecording, isProcessing]);

    /** Reset the textarea height back to its single-line baseline. */
    const resetHeight = () => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
        }
    };

    /** Grow the textarea to fit its content (capped at a max height). */
    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(event.target.value);
        autoResize();
    };

    const handleSend = () => {
        if (!canSend) {
            return;
        }
        sendMessage(value);
        setValue("");
        resetHeight();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends; Shift+Enter inserts a newline.
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    if (isProcessing) {
        return (
            <div className="border-t border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-sm sm:px-4">
                <p
                    className="flex h-11 items-center justify-center gap-2 text-sm font-semibold text-slate-500"
                    role="status"
                    aria-live="polite"
                >
                    <Loader2
                        className="h-4 w-4 animate-spin text-amber-500"
                        aria-hidden="true"
                    />
                    Processing your speech…
                </p>
            </div>
        );
    }

    return (
        <div className="border-t border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-sm sm:px-4">
            <div className="flex items-end gap-2 sm:gap-3">
                {/* Mic button — single microphone entry point for the app
                    (Phase 3). Shares the exact same handleMicClick / voiceState
                    from VoiceContext that PremiumMicrophone used to render. */}
                <button
                    type="button"
                    ref={micButtonRef}
                    onClick={micDisabled ? undefined : handleMicClick}
                    disabled={micDisabled}
                    aria-label={micConfig.label}
                    aria-pressed={isRecording}
                    title={isRecording ? "Tap to stop and send" : "Voice input"}
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition active:scale-95 ${micConfig.baseClass} ${micDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"}`}
                >
                    <MicIcon className={`h-5 w-5 ${micConfig.iconClass}`} aria-hidden="true" />
                </button>

                {isRecording ? (
                    /* Recording UI — replaces ONLY the textarea area with the
                       waveform + "Listening...". The send button is hidden;
                       there is nothing to send by hand while recording. The
                       waveform is the existing VoiceWaveform component,
                       unmodified, with a smaller bar count sized for this
                       compact bar instead of the full-width sidebar card it
                       used to live in. */
                    <div
                        className="flex h-11 min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-2xl border border-red-200 bg-red-50/60 px-3"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <VoiceWaveform isActive bars={16} />
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-red-600">
                            Listening...
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Auto-resizing textarea — typing is completely
                            unchanged: Enter sends, Shift+Enter inserts a
                            newline, empty/whitespace messages are blocked. */}
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder={placeholder}
                            disabled={!isActive || isLocked}
                            aria-label="Type your message"
                            className="max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-70"
                        />

                        {/* Send button */}
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!canSend}
                            aria-label="Send message"
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                            <SendHorizontal className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
