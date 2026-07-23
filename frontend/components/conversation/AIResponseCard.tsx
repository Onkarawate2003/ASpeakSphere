"use client";

import { memo, useMemo } from "react";
import {
    Pause,
    Play,
    RotateCcw,
    Languages,
    Gauge,
    Sparkles,
    Volume2,
    VolumeX,
} from "lucide-react";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useOptionalVoice } from "@/features/conversation/VoiceContext";
import { TUTOR_NAME } from "@/features/conversation/constants";
import { PRACTICE_WELCOME_MESSAGES } from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";

/**
 * Phase M14 Enhancement — AIResponseCard.
 *
 * A large, premium response card that surfaces Emma's **latest** AI message as
 * the focal point of the redesigned Conversation screen — the place the
 * learner's eye lands right after the tutor portrait. It mirrors the
 * "current AI response" panel pattern used by premium AI-tutor apps, but with
 * ASpeakSphere's own visual language (slate-950 gradient, indigo accents,
 * generous spacing, rounded corners, elegant shadows).
 *
 * Responsibilities:
 *  - Show the newest AI message (or a friendly placeholder before the session
 *    starts / while Emma is composing her first reply).
 *  - Provide voice controls (Replay / Pause / Mute) that reuse the existing
 *    `useOptionalVoice()` TTS API. Phase 2 content cleanup: this card is now
 *    the SINGLE playback-control surface for the app — the duplicate
 *    controls previously in `VoiceConversationPanel`, `VoiceMessageCard`,
 *    and the per-message `ChatBubble` button were removed so there is one
 *    obvious place to control Emma's voice.
 *  - Reserve future-placeholder controls (Translate, Slow playback) as
 *    disabled, clearly-labelled "coming soon" chips so the architecture is
 *    ready for Phase M15+ without wiring them up prematurely.
 *
 * Speech synchronization:
 * The Replay/Pause button reflects the real `playbackState` of the active AI
 * message (driven by the HTMLAudioElement `playing`/`pause`/`ended` events in
 * `useTtsPlayback`). It is NOT timer-driven. When audio is playing → "Pause";
 * when paused → "Resume"; when ended → "Replay"; otherwise → "Listen".
 *
 * Performance:
 *  - `useMemo` over the messages array finds the latest AI message once per
 *    render (O(n) but n is tiny — capped at MAX_USER_MESSAGES exchanges).
 *  - `memo`-ized so it only re-renders when `messages`, `playbackState`, or
 *    `activeMessageId` change.
 *
 * Backward compatibility:
 * Uses `useOptionalVoice()` (returns null on read-only history pages), so the
 * voice controls gracefully hide when TTS is unavailable — exactly like
 * `ChatBubble` does today.
 *
 * Accessibility:
 *  - The card is a semantic `<article>` with an `aria-live="polite"` region so
 *    screen readers announce Emma's new replies.
 *  - Voice control buttons have descriptive `aria-label`s.
 *  - Future-placeholder chips are `aria-disabled` and announced as "coming soon".
 */

type AIResponseCardProps = {
    /** Optional extra classes for layout tweaks. */
    className?: string;
};

/**
 * Find the newest AI message in the transcript (or null if there isn't one).
 * Scans from the end so it is O(latest) in practice.
 */
function pickLatestAiMessage(
    messages: ReturnType<typeof useConversation>["messages"],
) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i].role === "ai") return messages[i];
    }
    return null;
}

function AIResponseCardInner({ className = "" }: AIResponseCardProps) {
    const { messages, isTyping, status, practiceType } = useConversation();
    const voice = useOptionalVoice();

    const ttsEnabled = voice?.ttsEnabled ?? false;
    const playbackState = voice?.playbackState ?? "idle";
    const activeMessageId = voice?.activeMessageId ?? null;
    const speak = voice?.speak ?? (async () => { });
    const pause = voice?.pause ?? (() => { });
    const resume = voice?.resume ?? (() => { });
    const replay = voice?.replay ?? (() => { });
    const isMuted = voice?.isMuted ?? false;
    const toggleMute = voice?.toggleMute ?? (() => { });

    const latestAi = useMemo(() => pickLatestAiMessage(messages), [messages]);

    // Whether the latest AI message is the one currently loaded/playing.
    const isActiveMessage = !!latestAi && activeMessageId === latestAi.id;
    const isThisPlaying = isActiveMessage && playbackState === "playing";
    const isThisPaused = isActiveMessage && playbackState === "paused";
    const isThisEnded = isActiveMessage && playbackState === "ended";

    /**
     * Replay (or play) the latest AI message's audio via TTS. Mirrors the
     * exact logic in `ChatBubble.handleReplay` so there is one consistent
     * behaviour across the transcript and the focal response card:
     *  - paused → resume (no new request)
     *  - ended  → replay from start (reuses cached object URL)
     *  - otherwise → fetch fresh TTS audio via `speak()`
     */
    const handleVoiceControl = () => {
        if (!latestAi) return;
        if (isThisPlaying) {
            pause();
        } else if (isThisPaused) {
            resume();
        } else if (isThisEnded) {
            replay();
        } else {
            void speak(latestAi.id, latestAi.content);
        }
    };

    const voiceButtonLabel = isThisPlaying
        ? "Pause Emma's voice"
        : isActiveMessage
            ? isThisPaused
                ? "Resume Emma's voice"
                : "Replay Emma's voice"
            : "Listen to Emma's reply";

    const voiceButtonContent = isThisPlaying
        ? "Pause"
        : isActiveMessage
            ? isThisPaused
                ? "Resume"
                : "Replay"
            : "Listen";

    // Placeholder content shown before the session starts or while Emma
    // composes her very first reply.
    const placeholder =
        practiceType
            ? PRACTICE_WELCOME_MESSAGES[practiceType as PracticeType]
            : "I'm here to help you practice English. Let's get started whenever you're ready.";

    const showPlaceholder = !latestAi || (status === "idle" && !isTyping);

    return (
        <article
            aria-live="polite"
            aria-label="Emma's latest response"
            className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-2xl shadow-slate-900/30 sm:p-6 ${className}`}
        >
            {/* Decorative top accent */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
            />

            {/* Header row — tutor name + "latest response" tag */}
            <header className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-extrabold uppercase tracking-wide text-blue-200">
                        {TUTOR_NAME}
                    </span>
                </div>
                <span className="hidden rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-inset ring-white/10 sm:inline">
                    Latest response
                </span>
            </header>

            {/* Response body */}
            <div className="min-h-[4.5rem]">
                {showPlaceholder ? (
                    <p className="text-[0.95rem] leading-relaxed text-slate-300">
                        {placeholder}
                    </p>
                ) : isTyping && !isActiveMessage ? (
                    // Emma is composing a reply — show an elegant typing shimmer.
                    <div className="space-y-2" aria-label="Emma is typing">
                        <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                        <div className="h-3 w-11/12 animate-pulse rounded-full bg-white/10" />
                        <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
                    </div>
                ) : (
                    <p className="whitespace-pre-line break-words text-[1.05rem] leading-relaxed text-slate-100">
                        {latestAi?.content}
                    </p>
                )}
            </div>

            {/* Voice controls + future placeholders */}
            <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                {/* Primary voice control — Replay / Pause / Resume / Listen,
                    plus Mute. This is the single playback-control surface
                    for the app (Phase 2 content cleanup). */}
                {ttsEnabled && !showPlaceholder && (
                    <>
                        <button
                            type="button"
                            onClick={handleVoiceControl}
                            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95"
                            aria-label={voiceButtonLabel}
                        >
                            {isThisPlaying ? (
                                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : isActiveMessage && isThisEnded ? (
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {voiceButtonContent}
                        </button>
                        <button
                            type="button"
                            onClick={toggleMute}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 active:scale-95"
                            aria-label={isMuted ? "Unmute Emma's voice" : "Mute Emma's voice"}
                        >
                            {isMuted ? (
                                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {isMuted ? "Unmute" : "Mute"}
                        </button>
                    </>
                )}

                {/* Future-placeholder controls — disabled, clearly "coming soon".
                    Reserved for Phase M15+ so the architecture is ready without
                    wiring up half-built features. */}
                <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label="Translate (coming soon)"
                    title="Translate — coming soon"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 ring-1 ring-inset ring-white/10"
                >
                    <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Translate</span>
                </button>
                <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label="Slow playback (coming soon)"
                    title="Slow playback — coming soon"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 ring-1 ring-inset ring-white/10"
                >
                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Slow</span>
                </button>
            </footer>
        </article>
    );
}

/**
 * Memoized export — the card only re-renders when `messages`, `playbackState`,
 * `activeMessageId`, `isTyping`, `status`, or `practiceType` change. Since the
 * voice API functions are stable (memoized in `VoiceContext`), this keeps
 * re-renders to the absolute minimum.
 */
const AIResponseCard = memo(AIResponseCardInner);

export default AIResponseCard;
