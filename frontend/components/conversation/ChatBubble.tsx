"use client";

import { Pause, Play, User } from "lucide-react";
import type { ConversationMessage } from "@/features/conversation/types";
import { TUTOR_NAME } from "@/features/conversation/constants";
import { useOptionalVoice } from "@/features/conversation/VoiceContext";
import type { AvatarState } from "@/features/conversation/useAvatarState";
import AnimatedTutorAvatar from "./AnimatedTutorAvatar";

type ChatBubbleProps = {
    message: ConversationMessage;
};

/**
 * A single chat message bubble.
 *
 * Layout & polish (Phase 2):
 * - AI messages: left-aligned, white card, ~75% max width, branded TutorAvatar.
 * - User messages: right-aligned, blue bubble, ~65% max width, user avatar.
 * - Bubbles size to their content (never stretched full width) and wrap
 *   naturally thanks to `whitespace-pre-line` + `break-words`.
 * - Generous internal padding, larger border radius, and a clear typography
 *   hierarchy (tutor name label + body) make the transcript easy to read.
 * The timestamp is rendered as a small placeholder under the bubble.
 */
export default function ChatBubble({ message }: ChatBubbleProps) {
    const isAI = message.role === "ai";
    // useOptionalVoice returns null when there is no VoiceProvider in the tree
    // (e.g. read-only history pages). Voice controls are hidden in that case.
    const voice = useOptionalVoice();
    const ttsEnabled = voice?.ttsEnabled ?? false;
    const playbackState = voice?.playbackState ?? "idle";
    const activeMessageId = voice?.activeMessageId ?? null;
    const speak = voice?.speak ?? (async () => { });
    const pause = voice?.pause ?? (() => { });
    const resume = voice?.resume ?? (() => { });
    const replay = voice?.replay ?? (() => { });

    // Whether this specific AI message is the one currently loaded/playing.
    const isActiveMessage = isAI && activeMessageId === message.id;
    const isThisPlaying = isActiveMessage && playbackState === "playing";
    const isThisPaused = isActiveMessage && playbackState === "paused";
    const isThisEnded = isActiveMessage && playbackState === "ended";

    // Phase M14 — per-message avatar state. The small avatar in each AI
    // bubble animates its mouth only while THIS message's audio is playing,
    // holds while paused, and breathes gently otherwise. This is the
    // speech-synced per-message counterpart to the hero avatar.
    const avatarState: AvatarState = isThisPlaying
        ? "speaking"
        : isThisPaused
            ? "paused"
            : isActiveMessage && playbackState === "loading"
                ? "loading"
                : "idle";
    // Kept for the replay-button label logic below.
    const isThisSpeaking = isThisPlaying;

    /**
     * Replay (or play) this AI message's audio via TTS.
     *
     * Performance (Part 8 — avoid duplicate synthesis):
     *  - If audio is already loaded for this message and **paused** → resume
     *    (no new request).
     *  - If audio is already loaded for this message and **ended** → replay
     *    from the start (no new request — reuses the cached object URL).
     *  - Otherwise (not loaded yet, or a different message was loaded) →
     *    fetch fresh TTS audio via `speak()`.
     */
    const handleReplay = () => {
        if (isThisPaused) {
            resume();
        } else if (isThisEnded) {
            replay();
        } else {
            void speak(message.id, message.content);
        }
    };

    return (
        <div
            className={`spk-bubble-enter flex w-full items-end gap-2.5 sm:gap-3 ${isAI ? "justify-start" : "flex-row-reverse justify-start"
                }`}
        >
            {/* Avatar — Phase M14 animated, speech-synced per message. */}
            {isAI ? (
                <AnimatedTutorAvatar state={avatarState} size="sm" />
            ) : (
                <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow-sm ring-1 ring-inset ring-white/40"
                    aria-hidden="true"
                >
                    <User className="h-4 w-4" />
                </div>
            )}

            {/* Bubble + timestamp */}
            <div
                className={`flex flex-col gap-1 ${isAI ? "max-w-[75%] items-start" : "max-w-[65%] items-end"
                    }`}
            >
                <div
                    className={`rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed shadow-sm transition-colors sm:px-5 sm:py-3.5 ${isAI
                        ? "rounded-bl-md border border-slate-200/80 bg-white text-slate-800"
                        : "rounded-br-md bg-blue-600 text-white"
                        }`}
                >
                    {isAI && (
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-blue-600">
                            {TUTOR_NAME}
                        </p>
                    )}
                    <p className="whitespace-pre-line break-words">
                        {message.content}
                    </p>
                </div>
                <span className="px-1 text-[11px] font-medium text-slate-400">
                    {message.timestamp}
                </span>
                {/* Phase 11.5 — per-message TTS replay control for AI
                    messages. Shown only when TTS is available. Lets the
                    learner replay any of Emma's replies on demand. */}
                {isAI && ttsEnabled && (
                    <button
                        type="button"
                        onClick={isThisPlaying ? pause : handleReplay}
                        className="mt-0.5 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        aria-label={
                            isThisPlaying
                                ? "Pause Emma's voice"
                                : "Play Emma's voice"
                        }
                    >
                        {isThisPlaying ? (
                            <Pause
                                className="h-3 w-3 text-indigo-600"
                                aria-hidden="true"
                            />
                        ) : (
                            <Play
                                className="h-3 w-3 text-indigo-600"
                                aria-hidden="true"
                            />
                        )}
                        {isThisPlaying
                            ? "Pause"
                            : isActiveMessage
                                ? "Replay"
                                : "Listen"}
                    </button>
                )}
            </div>
        </div>
    );
}
