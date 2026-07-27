"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { synthesizeSpeech } from "./speechApi";
import { getSpeechStatus } from "./speechApi";
import {
    DEFAULT_SPEECH_SPEED_VALUE,
    SPEECH_SPEED_LABELS,
    SPEECH_SPEED_OPTIONS,
    speechSpeedRateForValue,
    type SpeechSpeed,
    type SpeechSpeedValue,
    type SpeechStatusDTO,
} from "./speechTypes";
import { ApiError } from "@/features/auth/api";

/** localStorage key under which the selected speech speed value is persisted. */
const SPEECH_SPEED_STORAGE_KEY = "spk.speechSpeed";

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
     * Speech Speed Control — the currently selected playback speed
     * multiplier. Persisted to localStorage and restored on mount, so the
     * user's choice survives reopening the conversation screen. Applied to
     * every `speak()` call made after it changes.
     */
    speechSpeed: SpeechSpeed;
    /** Stable string identifier for the selected speed (e.g. "normal"). */
    speechSpeedValue: SpeechSpeedValue;
    /** Display label for `speechSpeed` (e.g. "Normal", "Slow"). */
    speechSpeedLabel: string;
    /**
     * Set the playback speed to a specific option. Pure state update +
     * localStorage persist — makes no network request, so changing speed
     * never regenerates any audio by itself. The new speed only takes
     * effect on the next `speak()`/`replay()` call.
     */
    setSpeechSpeed: (value: SpeechSpeedValue) => void;
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
    // Speech Speed Control — persisted across sessions via localStorage.
    // The numeric `speechSpeed` (rate) is what the backend receives; the
    // string `speechSpeedValue` is the stable identifier persisted and shown
    // in the dropdown. Both are derived from the same option.
    //
    // The initial value is read once from localStorage via a lazy
    // initializer (SSR-safe: `window` is only touched on the client). This
    // restores the saved speed when the conversation screen loads, without
    // an extra mount effect / cascading render.
    const [speechSpeedValue, setSpeechSpeedValue] = useState<SpeechSpeedValue>(
        () => {
            if (typeof window === "undefined") return DEFAULT_SPEECH_SPEED_VALUE;
            try {
                const stored = window.localStorage.getItem(
                    SPEECH_SPEED_STORAGE_KEY,
                ) as SpeechSpeedValue | null;
                if (!stored) return DEFAULT_SPEECH_SPEED_VALUE;
                // Validate against the known options so a stale/unknown value
                // from an older app version can never break playback.
                return SPEECH_SPEED_OPTIONS.some((o) => o.value === stored)
                    ? stored
                    : DEFAULT_SPEECH_SPEED_VALUE;
            } catch {
                return DEFAULT_SPEECH_SPEED_VALUE;
            }
        },
    );
    const speechSpeed: SpeechSpeed = speechSpeedRateForValue(speechSpeedValue);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    // Monotonic token so a stale TTS fetch can't overwrite a newer one.
    const requestTokenRef = useRef<number>(0);
    // Remembers the (messageId, text, speed) behind the currently loaded
    // audio so `replay()` can tell whether the speed has changed since that
    // audio was generated, and re-synthesize only when it actually has.
    const lastRequestRef = useRef<{ messageId: string; text: string } | null>(
        null,
    );
    const lastSynthesizedSpeedRef = useRef<SpeechSpeed>(1);

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

            // Speech Speed Control — remember exactly what this request was
            // for (and at what speed) so replay() can later tell whether the
            // speed has since changed and a fresh synthesis is needed.
            lastRequestRef.current = { messageId, text };
            lastSynthesizedSpeedRef.current = speechSpeed;

            // Stop any currently playing audio first.
            const el = ensureAudioElement();
            el.pause();
            revokeUrl();

            try {
                const buffer = await synthesizeSpeech({ text, speed: speechSpeed });
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
        [ttsEnabled, isMuted, speechSpeed, ensureAudioElement, revokeUrl, attachEvents],
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
        // Speech Speed Control — if the speed has changed since this audio
        // was generated, a plain seek-and-play would replay it at the old
        // speed. Re-synthesize at the current speed instead. When the speed
        // hasn't changed, this is a no-op fast path exactly like before:
        // no network request, just seek + play.
        if (
            lastSynthesizedSpeedRef.current !== speechSpeed &&
            lastRequestRef.current
        ) {
            void speak(lastRequestRef.current.messageId, lastRequestRef.current.text);
            return;
        }
        const el = audioRef.current;
        if (el && el.src) {
            el.currentTime = 0;
            void el.play().catch(() => {
                setPlaybackState("paused");
            });
        }
    }, [speak, speechSpeed]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            if (audioRef.current) {
                audioRef.current.muted = next;
            }
            return next;
        });
    }, []);

    /**
     * Speech Speed Control — set the playback speed to a specific option.
     * Pure state update + localStorage persist: no network request, so
     * changing speed never regenerates any audio by itself — the new speed
     * is only used the next time `speak()` or a stale-speed `replay()` runs.
     *
     * The selection is persisted to localStorage so it survives reopening
     * the conversation screen (same approach used for other user
     * preferences in the app).
     */
    const setSpeechSpeed = useCallback((value: SpeechSpeedValue) => {
        setSpeechSpeedValue(value);
        try {
            window.localStorage.setItem(SPEECH_SPEED_STORAGE_KEY, value);
        } catch {
            // localStorage may be unavailable (private mode / quota) —
            // silently degrade to session-only persistence.
        }
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
        speechSpeed,
        speechSpeedValue,
        speechSpeedLabel: SPEECH_SPEED_LABELS[speechSpeed],
        setSpeechSpeed,
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
