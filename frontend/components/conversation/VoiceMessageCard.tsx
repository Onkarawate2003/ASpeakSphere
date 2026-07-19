"use client";

import { Mic, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useOptionalVoice } from "@/features/conversation/VoiceContext";

/**
 * Voice message card — Phase 11.5 Real-Time Voice Conversation.
 *
 * Previously a UI-only placeholder with a disabled "Replay (Coming Soon)"
 * button. Now wired to the shared voice context so it reflects the active
 * AI reply's TTS playback state and offers play/pause/replay/mute controls.
 *
 * The card shows the most recent AI message's status. When no audio is
 * loaded, it displays a friendly idle state. When TTS is not configured,
 * it explains that voice playback is unavailable (text-only mode).
 */
export default function VoiceMessageCard() {
    const { messages, isTyping } = useConversation();
    // useOptionalVoice returns null when there is no VoiceProvider in the tree
    // (e.g. read-only history pages). Fallback to ttsEnabled=false so the
    // component renders its existing "Voice playback unavailable" state.
    const voice = useOptionalVoice();
    const ttsEnabled = voice?.ttsEnabled ?? false;
    const playbackState = voice?.playbackState ?? ("idle" as const);
    const isMuted = voice?.isMuted ?? false;
    const activeMessageId = voice?.activeMessageId ?? null;
    const speak = voice?.speak ?? (async () => {});
    const pause = voice?.pause ?? (() => {});
    const resume = voice?.resume ?? (() => {});
    const replay = voice?.replay ?? (() => {});
    const toggleMute = voice?.toggleMute ?? (() => {});

    // Find the most recent AI message to label the card.
    const lastAiMessage = [...messages]
        .reverse()
        .find((m) => m.role === "ai");

    // Whether the loaded audio belongs to the most recent AI message.
    const isLastActive =
        lastAiMessage !== undefined && activeMessageId === lastAiMessage.id;
    const isLoading = playbackState === "loading";
    const isPlaying = playbackState === "playing";
    const isPaused = playbackState === "paused";
    const isEnded = playbackState === "ended";
    const isError = playbackState === "error";

    /**
     * Play or resume the most recent AI reply.
     *
     * Performance (Part 8 — avoid duplicate synthesis):
     *  - If audio is already loaded for this message and **paused** → resume
     *    (no new request).
     *  - If audio is already loaded for this message and **ended** → replay
     *    from the start (no new request — reuses the cached object URL).
     *  - Otherwise → fetch fresh TTS audio via `speak()`.
     */
    const handlePlay = () => {
        if (!lastAiMessage) return;
        if (isPaused && isLastActive) {
            resume();
        } else if (isEnded && isLastActive) {
            replay();
        } else {
            void speak(lastAiMessage.id, lastAiMessage.content);
        }
    };

    // Status label under the title.
    const statusLabel = (() => {
        if (!ttsEnabled) return "Voice playback unavailable";
        if (isTyping) return "Emma is replying…";
        if (isLoading) return "Generating voice…";
        if (isPlaying) return "Playing Emma's voice";
        if (isPaused) return "Paused";
        if (isEnded) return "Finished — tap replay";
        if (isError) return "Voice unavailable — text shown above";
        if (lastAiMessage) return "Tap play to hear Emma's reply";
        return "No voice messages yet";
    })();

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Voice response card"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50">
                    <Mic className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                        🎤 Voice Response
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Volume2
                            className="h-3 w-3"
                            aria-hidden="true"
                        />
                        {statusLabel}
                    </p>
                </div>
            </div>

            {ttsEnabled ? (
                <div className="mt-4 flex items-center gap-2">
                    {/* Play / Pause */}
                    {isPlaying ? (
                        <button
                            type="button"
                            onClick={pause}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                            aria-label="Pause Emma's voice"
                        >
                            <Pause className="h-4 w-4" aria-hidden="true" />
                            Pause
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handlePlay}
                            disabled={!lastAiMessage || isLoading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Play Emma's voice"
                        >
                            <Play className="h-4 w-4" aria-hidden="true" />
                            {isLoading ? "Loading…" : isPaused ? "Resume" : "Play"}
                        </button>
                    )}

                    {/* Replay */}
                    <button
                        type="button"
                        onClick={replay}
                        disabled={!isLastActive || isLoading}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Replay Emma's voice"
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Mute toggle */}
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                        aria-label={isMuted ? "Unmute voice" : "Mute voice"}
                    >
                        {isMuted ? (
                            <VolumeX className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Volume2 className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
            ) : (
                <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-500">
                    Voice playback is not configured. Emma's replies are
                    shown as text above.
                </div>
            )}
        </section>
    );
}
