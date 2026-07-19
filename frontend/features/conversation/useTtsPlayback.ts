"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { synthesizeSpeech } from "./speechApi";
import { getSpeechStatus } from "./speechApi";
import type { SpeechStatusDTO } from "./speechTypes";
import { ApiError } from "@/features/auth/api";

/**
 * Playback status for a single AI reply's audio.
 * - "idle"     → no audio loaded.
 * - "loading"  → fetching TTS audio from the backend.
 * - "playing"  → audio is currently playing.
 * - "paused"   → audio is loaded but paused.
 * - "ended"    → playback finished (can replay).
 * - "error"    → TTS failed; text-only fallback.
 */
export type PlaybackState =
    | "idle"
    | "loading"
    | "playing"
    | "paused"
    | "ended"
    | "error";

export type TtsPlaybackResult = {
    /** Whether TTS is available on the backend (Microsoft Edge TTS configured). */
    ttsEnabled: boolean;
    /** Whether STT is available on the backend (Groq Whisper configured). */
    sttEnabled: boolean;
    /** Current playback state for the active reply. */
    playbackState: PlaybackState;
    /** Whether audio is currently muted (master mute). */
    isMuted: boolean;
    /**
     * The message id whose audio is currently loaded/playing, so the UI can
     * highlight the active reply. Null when nothing is loaded.
     */
    activeMessageId: string | null;
    /**
     * Load + auto-play TTS for the given AI reply text. Only the newest
     * call wins — any in-flight request for an older reply is superseded.
     * If TTS is unavailable, sets state to "error" (text-only fallback).
     */
    speak: (messageId: string, text: string) => Promise<void>;
    /** Pause the currently playing audio. */
    pause: () => void;
    /** Resume playback from where it was paused. */
    resume: () => void;
    /** Replay the currently loaded audio from the start. */
    replay: () => void;
    /** Toggle the master mute flag (does not stop playback, just silences). */
    toggleMute: () => void;
    /** Stop and discard the current audio (e.g. when a new turn starts). */
    stop: () => void;
    /** Ensure the audio element is instantiated synchronously during user interaction. */
    ensureAudioElement: () => HTMLAudioElement;
};

/**
 * Hook that manages text-to-speech playback for AI replies.
 *
 * Design (Phase 11.5 Part 2):
 *  - Only the **newest** AI reply auto-plays. A request token guards against
 *    stale responses overwriting newer ones.
 *  - Audio is fetched as raw MP3 bytes → object URL → `<audio>` element.
 *  - The object URL is revoked on stop/unmount to avoid memory leaks.
 *  - When TTS is not configured (503), the hook sets `playbackState="error"`
 *    so the UI falls back to text-only display without breaking the session.
 *  - A master mute toggle silences the audio element without stopping it.
 *
 * The hook is UI-agnostic; the VoiceConversationPanel and VoiceMessageCard
 * consume its state to render playback controls.
 */
export function useTtsPlayback(): TtsPlaybackResult {
    const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
    const [sttEnabled, setSttEnabled] = useState<boolean>(false);
    const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [activeMessageId, setActiveMessageId] = useState<string | null>(
        null,
    );

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    // Monotonic token so a stale TTS fetch can't overwrite a newer one.
    const requestTokenRef = useRef<number>(0);

    /** Create the audio element lazily (client-side only). */
    const ensureAudioElement = useCallback((): HTMLAudioElement => {
        if (audioRef.current) return audioRef.current;
        const el = new Audio();
        el.preload = "auto";
        audioRef.current = el;
        return el;
    }, []);

    /** Revoke any held object URL to free memory. */
    const revokeUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    /** Fetch TTS availability once on mount. */
    useEffect(() => {
        let cancelled = false;
        getSpeechStatus()
            .then((status: SpeechStatusDTO) => {
                if (cancelled) return;
                setTtsEnabled(status.tts_enabled);
                setSttEnabled(status.stt_enabled);
            })
            .catch(() => {
                // If the status endpoint itself fails, assume unavailable so
                // the UI degrades to text-only without throwing.
                if (cancelled) return;
                setTtsEnabled(false);
                setSttEnabled(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Clean up audio + object URL on unmount. */
    useEffect(() => {
        return () => {
            revokeUrl();
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                audioRef.current = null;
            }
        };
    }, [revokeUrl]);

    /** Wire audio element events to playback state. */
    const attachEvents = useCallback((el: HTMLAudioElement, token: number) => {
        const onPlaying = () => {
            if (requestTokenRef.current !== token) return;
            setPlaybackState("playing");
        };
        const onPause = () => {
            if (requestTokenRef.current !== token) return;
            setPlaybackState((prev) =>
                prev === "playing" || prev === "loading" ? "paused" : prev,
            );
        };
        const onEnded = () => {
            if (requestTokenRef.current !== token) return;
            setPlaybackState("ended");
        };
        const onError = () => {
            if (requestTokenRef.current !== token) return;
            setPlaybackState("error");
        };
        el.addEventListener("playing", onPlaying);
        el.addEventListener("pause", onPause);
        el.addEventListener("ended", onEnded);
        el.addEventListener("error", onError);
        return () => {
            el.removeEventListener("playing", onPlaying);
            el.removeEventListener("pause", onPause);
            el.removeEventListener("ended", onEnded);
            el.removeEventListener("error", onError);
        };
    }, []);

    const speak = useCallback(
        async (messageId: string, text: string) => {
            // If TTS is known to be unavailable, short-circuit to text-only.
            if (!ttsEnabled) {
                setActiveMessageId(messageId);
                setPlaybackState("error");
                return;
            }

            const token = ++requestTokenRef.current;
            setActiveMessageId(messageId);
            setPlaybackState("loading");

            // Stop any currently playing audio first.
            const el = ensureAudioElement();
            el.pause();
            revokeUrl();

            try {
                const buffer = await synthesizeSpeech({ text });
                // Stale guard: a newer speak() call superseded this one.
                if (requestTokenRef.current !== token) return;

                const blob = new Blob([buffer], { type: "audio/mpeg" });
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;

                el.src = url;
                el.muted = isMuted;
                const detach = attachEvents(el, token);

                // Auto-play. Browsers may block autoplay with sound; we attempt
                // it and fall back to "paused" if it rejects.
                try {
                    await el.play();
                } catch {
                    if (requestTokenRef.current !== token) {
                        detach();
                        return;
                    }
                    setPlaybackState("paused");
                }
            } catch (err) {
                if (requestTokenRef.current !== token) return;
                if (err instanceof ApiError && err.status === 503) {
                    // TTS not configured — text-only fallback.
                    setTtsEnabled(false);
                }
                setPlaybackState("error");
            }
        },
        [ttsEnabled, isMuted, ensureAudioElement, revokeUrl, attachEvents],
    );

    const pause = useCallback(() => {
        audioRef.current?.pause();
    }, []);

    const resume = useCallback(() => {
        const el = audioRef.current;
        if (el && el.src) {
            void el.play().catch(() => {
                setPlaybackState("paused");
            });
        }
    }, []);

    const replay = useCallback(() => {
        const el = audioRef.current;
        if (el && el.src) {
            el.currentTime = 0;
            void el.play().catch(() => {
                setPlaybackState("paused");
            });
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            if (audioRef.current) {
                audioRef.current.muted = next;
            }
            return next;
        });
    }, []);

    const stop = useCallback(() => {
        requestTokenRef.current += 1; // invalidate any in-flight fetch
        const el = audioRef.current;
        if (el) {
            el.pause();
            el.src = "";
        }
        revokeUrl();
        setPlaybackState("idle");
        setActiveMessageId(null);
    }, [revokeUrl]);

    return {
        ttsEnabled,
        sttEnabled,
        playbackState,
        isMuted,
        activeMessageId,
        speak,
        pause,
        resume,
        replay,
        toggleMute,
        stop,
        ensureAudioElement,
    };
}
