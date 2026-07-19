"use client";

import { useMemo } from "react";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useOptionalVoice } from "@/features/conversation/VoiceContext";
import type { PlaybackState } from "@/features/conversation/useTtsPlayback";

/**
 * Phase M14 — AI Animated Avatar & Speech-Synchronized Conversation.
 *
 * The seven visual states of the animated AI tutor avatar. Each state maps
 * to a distinct CSS animation profile (breathing, blinking, talking, etc.)
 * defined in `globals.css` and rendered by `AnimatedTutorAvatar`.
 *
 * State priority (highest → lowest) drives the derivation so the avatar
 * always reflects the single most relevant thing happening right now:
 *
 *   1. `error`      — a TTS/STT failure occurred (transient, then idle).
 *   2. `speaking`   — Emma's TTS audio is actively playing (mouth moves).
 *   3. `paused`     — Emma's TTS audio is loaded but paused (mouth holds).
 *   4. `loading`    — TTS audio is being fetched OR the AI reply is loading.
 *   5. `thinking`   — Emma is composing a reply (isTyping, pre-TTS).
 *   6. `listening`  — the user is recording speech (attentive, ear turned).
 *   7. `idle`       — nothing happening (gentle breathing + blinking).
 *
 * IMPORTANT — speech synchronization contract:
 * The `speaking` state is driven **only** by `PlaybackState === "playing"`
 * (the HTMLAudioElement `playing` event). It is NOT driven by timers or by
 * `isTyping`. This guarantees the avatar's mouth moves exactly while real
 * audio is audible, and stops the instant audio ends or pauses — satisfying
 * the "no continuous looping after speech finishes" requirement.
 */
export type AvatarState =
    | "idle"
    | "listening"
    | "thinking"
    | "loading"
    | "speaking"
    | "paused"
    | "error";

/** Human-readable label for each avatar state (used for aria-live + badges). */
export const AVATAR_STATE_LABELS: Record<AvatarState, string> = {
    idle: "Emma is ready",
    listening: "Emma is listening",
    thinking: "Emma is thinking",
    loading: "Loading Emma's voice",
    speaking: "Emma is speaking",
    paused: "Emma's voice is paused",
    error: "Something went wrong",
};

/**
 * Derive the avatar animation state from the existing Voice + Conversation
 * contexts.
 *
 * This hook introduces **no new state** — it is a pure derivation layer
 * (the "AvatarStateManager" from the spec) that reads the single sources of
 * truth already maintained by `VoiceProvider` and `ConversationProvider`:
 *
 *   - `playbackState` (from `useTtsPlayback` via `useVoice`) — the exact
 *     HTMLAudioElement state. `playing` ⇒ `speaking`, `paused` ⇒ `paused`,
 *     `loading` ⇒ `loading`, `error` ⇒ `error`.
 *   - `voiceState` (from `VoiceContext.computeVoiceState`) — `recording`
 *     ⇒ `listening`, `processing` ⇒ `loading`.
 *   - `isTyping` / `isLoading` (from `ConversationContext`) — ⇒ `thinking`
 *     / `loading` when no higher-priority audio state is active.
 *
 * Because it consumes `useOptionalVoice`, it works on **both** the live
 * conversation page (full VoiceProvider) and read-only history pages (no
 * VoiceProvider → voice is null → avatar stays `idle`/`thinking`). This
 * preserves backward compatibility with the history detail view.
 *
 * @returns the current `AvatarState` plus its accessible label.
 */
export function useAvatarState(): {
    state: AvatarState;
    label: string;
} {
    const { isTyping, isLoading } = useConversation();
    const voice = useOptionalVoice();

    const playbackState: PlaybackState = voice?.playbackState ?? "idle";
    const voiceState = voice?.voiceState ?? "idle";

    const state = useMemo<AvatarState>(() => {
        // 1. Error — TTS/STT failure (highest priority, transient).
        if (playbackState === "error") {
            return "error";
        }

        // 2. Speaking — real audio is playing. THIS is the speech-sync signal.
        if (playbackState === "playing") {
            return "speaking";
        }

        // 3. Paused — audio loaded but paused (mouth holds, no talking loop).
        if (playbackState === "paused") {
            return "paused";
        }

        // 4. Loading — TTS audio is being fetched for the active reply.
        if (playbackState === "loading") {
            return "loading";
        }

        // 5. Listening — the user is actively recording speech.
        if (voiceState === "recording") {
            return "listening";
        }

        // 6. Processing — STT transcription in flight (treat as loading).
        if (voiceState === "processing") {
            return "loading";
        }

        // 7. Thinking — Emma is composing a reply (isTyping) and no audio is
        //    loaded yet. Also covers the initial AI message fetch (isLoading).
        if (isTyping || isLoading) {
            return "thinking";
        }

        // 8. Default — calm idle.
        return "idle";
    }, [playbackState, voiceState, isTyping, isLoading]);

    return {
        state,
        label: AVATAR_STATE_LABELS[state],
    };
}
