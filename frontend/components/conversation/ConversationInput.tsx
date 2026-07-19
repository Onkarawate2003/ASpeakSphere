"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Mic, SendHorizontal, Square } from "lucide-react";
import { useConversation } from "@/features/conversation/ConversationContext";
import { useVoice } from "@/features/conversation/VoiceContext";
import {
    DEFAULT_INPUT_PLACEHOLDER,
    PRACTICE_INPUT_PLACEHOLDERS,
} from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";

/**
 * Sticky bottom input bar.
 * - Auto-resizing textarea + a mic button + a send button.
 * - Enter sends the message; Shift+Enter inserts a newline.
 * - Empty/whitespace messages are blocked.
 * - Input clears (and resets height) after sending.
 *
 * Phase 11.5 — Real-Time Voice Conversation:
 * - The mic button is now wired to the real voice flow via `useVoice()`.
 *   Tapping it starts recording (Groq Whisper STT); tapping again stops,
 *   transcribes, and inserts the transcript into the existing conversation
 *   pipeline exactly as if the learner typed it.
 * - The recorder + transcription state machine lives in `VoiceContext` and
 *   is shared with the sidebar `VoiceConversationPanel`, so there is no
 *   duplicate logic (Part 10). This compact button is a second entry point
 *   to the same shared flow.
 * - The button is disabled while Emma is typing/processing, once the
 *   session is completed, or when the browser does not support audio
 *   recording. Typing always remains available as a fallback (Part 7).
 *
 * Phase 3:
 * - The input is disabled while Emma is typing and once the session is
 *   completed, preventing duplicate sends and post-completion messages.
 * - The placeholder adapts to these states for clear UX feedback.
 */
export default function ConversationInput() {
    const { sendMessage, status, practiceType, isTyping, isCompleted, isLoading } =
        useConversation();
    const { voiceState, handleMicClick, isRecorderSupported } = useVoice();
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const isActive = status === "active";
    // Block sending while Emma is typing, the session is completed, or a backend request is in flight.
    const isLocked = isTyping || isCompleted || isLoading;
    const canSend = isActive && !isLocked && value.trim().length > 0;

    const isRecording = voiceState === "recording";
    const isVoiceBusy = voiceState === "processing" || voiceState === "aiSpeaking";
    const micDisabled = !isActive || isLocked || isVoiceBusy || !isRecorderSupported;

    const placeholder = isRecording
        ? "Recording… tap the mic to stop and send."
        : !isActive
            ? DEFAULT_INPUT_PLACEHOLDER
            : isCompleted
                ? "Practice completed — start a new session to continue."
                : isTyping
                    ? "Emma is typing…"
                    : practiceType
                        ? PRACTICE_INPUT_PLACEHOLDERS[practiceType as PracticeType]
                        : DEFAULT_INPUT_PLACEHOLDER;

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

    return (
        <div className="border-t border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-sm sm:px-4">
            <div className="flex items-end gap-2 sm:gap-3">
                {/* Mic button — Phase 11.5 real voice flow. Shares the
                    recorder state machine in VoiceContext with the sidebar
                    VoiceConversationPanel. Disabled while the session is
                    inactive, Emma is typing/processing, or the browser
                    lacks recording support. */}
                <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={micDisabled}
                    aria-label={
                        isRecording ? "Stop recording and send" : "Start voice recording"
                    }
                    title={isRecording ? "Tap to stop and send" : "Voice input"}
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${isRecording
                            ? "border-red-300 bg-red-500 text-white shadow-md shadow-red-500/30"
                            : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                        } ${micDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                    {isRecording ? (
                        <Square className="h-4 w-4 fill-current" />
                    ) : (
                        <Mic className="h-5 w-5" />
                    )}
                </button>

                {/* Auto-resizing textarea */}
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
            </div>
        </div>
    );
}
