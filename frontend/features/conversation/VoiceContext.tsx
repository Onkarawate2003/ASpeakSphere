"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { toast } from "sonner";

import { useConversation } from "@/features/conversation/ConversationContext";
import {
    useTtsPlayback,
    type TtsPlaybackResult,
} from "@/features/conversation/useTtsPlayback";
import {
    MicrophoneError,
    useAudioRecorder,
} from "@/features/conversation/useAudioRecorder";
import { transcribeAudio } from "@/features/conversation/speechApi";
import { ApiError } from "@/features/auth/api";

import type { VoiceState } from "@/components/conversation/MicrophoneButton";

/** Hard cap on a single recording (seconds) before auto-processing. */
const MAX_RECORDING_SECONDS = 30;

type VoiceContextValue = TtsPlaybackResult & {
    /** Elapsed recording time in seconds (for the timer UI). */
    recorderSeconds: number;
    /** Whether the browser supports audio recording at all. */
    isRecorderSupported: boolean;
    /**
     * Computed 4-state voice state machine:
     * `idle → recording → processing → aiSpeaking → idle`.
     */
    voiceState: VoiceState;
    /**
     * Unified mic click handler. In `idle` it starts recording; in
     * `recording` it stops, transcribes (Groq Whisper), and inserts the
     * transcript into the existing conversation pipeline via
     * `sendMessage()`. Shared by every mic button in the app so there is
     * exactly one recording state machine (Part 10: avoid duplicate logic).
     */
    handleMicClick: () => void;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

/**
 * Voice Context — Phase 11.5 Real-Time Voice Conversation.
 *
 * A single provider that owns **all** voice orchestration for the
 * conversation page:
 *
 *  1. **TTS playback** (delegated to `useTtsPlayback`) — auto-play of the
 *     newest AI reply, plus play/pause/replay/mute controls.
 *  2. **Recording + transcription** (delegated to `useAudioRecorder` +
 *     `transcribeAudio`) — the mic state machine and Groq Whisper STT.
 *  3. **Auto-play effect** — watches the `isTyping` true→false transition
 *     and speaks the newest AI message.
 *  4. **Computed `voiceState`** — maps the recorder + TTS state into the
 *     4-state presentational model consumed by `MicrophoneButton` /
 *     `SessionStatus`.
 *
 * It consumes `ConversationContext` (so it must be nested inside
 * `ConversationProvider`). Both the sidebar `VoiceConversationPanel` and
 * the compact mic button in `ConversationInput` consume `useVoice()` and
 * share the same recorder — no duplicate logic.
 *
 * Only the **newest** AI reply auto-plays (a request-token guard in
 * `useTtsPlayback` supersedes stale fetches). The initial greeting is NOT
 * auto-played (it is added locally without the `isTyping` transition).
 * History loads never trigger auto-play either (`isTyping` stays false
 * during `loadConversation`).
 *
 * Error handling (Part 7) is centralised here so the UI components stay
 * purely presentational:
 *  - Microphone permission denied → toast + return to idle.
 *  - Empty/unintelligible speech → toast + return to idle.
 *  - STT/TTS API failures → toast + return to idle; the text pipeline is
 *    never broken (typing always remains available).
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
    const { messages, isTyping, status, isCompleted, sendMessage } =
        useConversation();
    const tts = useTtsPlayback();
    const recorder = useAudioRecorder(MAX_RECORDING_SECONDS);

    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const isProcessingRef = useRef<boolean>(false);
    isProcessingRef.current = isProcessing;
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    // Ref mirror so async callbacks read the latest value without re-subscribing.
    const voiceStateRef = useRef<VoiceState>("idle");
    voiceStateRef.current = voiceState;

    const sessionActive = status === "active";
    const sessionEnded = status === "ended" || isCompleted;

    // ── Auto-play effect (Part 3 — automatic AI playback) ─────────────
    // Track the previous isTyping value to detect the true→false transition.
    const prevIsTypingRef = useRef<boolean>(false);
    const lastSpokenIdRef = useRef<string | null>(null);

    // Refs that always mirror the latest values so the effect below can
    // depend on `isTyping` alone. This guarantees audio is generated exactly
    // once per AI message and is NEVER regenerated during React re-renders
    // (Part 8): the effect body only runs when `isTyping` actually changes,
    // not on every render or every `messages`/`tts` identity change.
    const speakRef = useRef(tts.speak);
    speakRef.current = tts.speak;
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    /**
     * When `isTyping` transitions from true→false, Emma's reply has just
     * been appended to `messages`. Find the newest AI message and speak it
     * via Microsoft Edge TTS. The greeting never triggers this (isTyping is
     * never true when the greeting is added). History loads never trigger
     * this either (isTyping stays false during `loadConversation`).
     *
     * Duplicate-synthesis guards (Part 8):
     *  - `lastSpokenIdRef` prevents re-speaking the same message id.
     *  - The effect deps are `[isTyping]` only, so re-renders (which change
     *    the `messages` array and `tts` object identities) do NOT re-trigger
     *    synthesis.
     *  - A monotonic request token inside `useTtsPlayback.speak()` supersedes
     *    any stale in-flight fetch if a newer AI reply arrives.
     */
    useEffect(() => {
        const wasTyping = prevIsTypingRef.current;
        prevIsTypingRef.current = isTyping;

        if (wasTyping && !isTyping) {
            const msgs = messagesRef.current;
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (msg.role === "ai") {
                    if (msg.id !== lastSpokenIdRef.current) {
                        lastSpokenIdRef.current = msg.id;
                        void speakRef.current(msg.id, msg.content);
                    }
                    break;
                }
            }
        }
    }, [isTyping]);

    // ── Voice state computation (Part 4) ───────────────────────────────
    /** Map the recorder + TTS state into the 4-state VoiceState. */
    const computeVoiceState = useCallback((): VoiceState => {
        if (recorder.state === "recording") return "recording";
        if (isProcessing) return "processing";
        if (
            isTyping ||
            tts.playbackState === "loading" ||
            tts.playbackState === "playing"
        )
            return "aiSpeaking";
        return "idle";
    }, [recorder.state, isProcessing, isTyping, tts.playbackState]);

    /** Reconcile the displayed voice state whenever inputs change. */
    useEffect(() => {
        const next = computeVoiceState();
        setVoiceState((prev) => (prev === next ? prev : next));
    }, [computeVoiceState]);

    // ── Recording + transcription (Part 1) ──────────────────────────────
    /**
     * Stop recording, transcribe via Groq Whisper, and insert the transcript
     * into the existing conversation pipeline. All failures degrade
     * gracefully to idle (typing remains available).
     */
    const stopAndTranscribe = useCallback(async () => {
        setIsProcessing(true);
        const result = await recorder.stopRecording();
        if (!result) {
            // Nothing captured (e.g. cancelled or empty).
            setIsProcessing(false);
            return;
        }
        try {
            const { text } = await transcribeAudio(result.blob, result.filename);
            // Insert the transcript into the existing conversation pipeline
            // exactly as if the learner typed it. No conversation logic is
            // duplicated — sendMessage handles optimistic insert, typing
            // indicator, backend persist, and AI reply.
            sendMessage(text);
            // The auto-play effect above will speak Emma's reply once
            // isTyping flips back to false.
            setIsProcessing(false);
        } catch (err) {
            if (err instanceof ApiError) {
                toast.error("Could not transcribe your speech", {
                    description: err.detail,
                });
            } else {
                toast.error("Could not transcribe your speech", {
                    description: "Please try speaking again or type your message.",
                });
            }
            setIsProcessing(false);
        }
    }, [recorder, sendMessage]);

    /** Start a real recording. Stops any TTS first so the mic doesn't
     *  capture Emma's voice. */
    const startRecording = useCallback(async () => {
        if (!sessionActive || sessionEnded) return;
        // Don't start while Emma is speaking/typing or a transcription is in flight.
        if (isTyping || isProcessingRef.current) return;
        // Stop any TTS playback so the mic doesn't capture Emma's voice.
        tts.stop();
        try {
            await recorder.startRecording();
            setVoiceState("recording");
        } catch (err) {
            if (err instanceof MicrophoneError) {
                if (err.reason === "denied") {
                    toast.error("Microphone access denied", {
                        description:
                            "Please allow microphone access in your browser settings to use voice mode. You can still type your messages.",
                    });
                } else if (err.reason === "unavailable") {
                    toast.error("Voice mode unavailable", {
                        description: err.message,
                    });
                } else {
                    toast.error("Could not start recording", {
                        description: err.message,
                    });
                }
            } else {
                toast.error("Could not start recording", {
                    description: "Please try again or type your message.",
                });
            }
            setVoiceState("idle");
        }
    }, [sessionActive, sessionEnded, isTyping, recorder, tts]);

    /** Unified mic click handler shared by every mic button. */
    const handleMicClick = useCallback(() => {
        // Pre-initialize/warm up the audio element synchronously on user interaction
        // to bypass Safari/iOS autoplay restrictions.
        tts.ensureAudioElement();

        if (voiceStateRef.current === "idle") {
            void startRecording();
        } else if (voiceStateRef.current === "recording") {
            void stopAndTranscribe();
        }
    }, [startRecording, stopAndTranscribe, tts]);

    // ── Reset on session end / restart ─────────────────────────────────
    useEffect(() => {
        if (!sessionActive) {
            recorder.cancelRecording();
            tts.stop();
            setIsProcessing(false);
            setVoiceState("idle");
        }
    }, [sessionActive, recorder, tts]);

    const value = useMemo<VoiceContextValue>(
        () => ({
            ...tts,
            recorderSeconds: recorder.seconds,
            isRecorderSupported: recorder.isSupported,
            voiceState,
            handleMicClick,
        }),
        [tts, recorder, voiceState, handleMicClick],
    );

    return (
        <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
    );
}

/**
 * Consume the voice context. Must be used inside `VoiceProvider`.
 * Returns the full voice API: TTS playback (speak, pause, resume, replay,
 * toggleMute, stop, playbackState, isMuted, activeMessageId, ttsEnabled,
 * sttEnabled) plus the shared recorder state (recorderSeconds,
 * isRecorderSupported, voiceState, handleMicClick).
 */
export function useVoice(): VoiceContextValue {
    const ctx = useContext(VoiceContext);
    if (!ctx) {
        throw new Error(
            "useVoice must be used within a VoiceProvider.",
        );
    }
    return ctx;
}

/**
 * Optional variant of `useVoice` that returns `null` when no
 * `VoiceProvider` is present in the tree. Use this in components that
 * must render inside **both** the live conversation page (where voice is
 * fully operational) and read-only pages such as history (where voice
 * controls should be hidden rather than crashing the app).
 *
 * Live-conversation components that should never be rendered without a
 * provider (e.g. `ConversationInput`, `VoiceConversationPanel`) should
 * continue using the strict `useVoice()` hook.
 */
export function useOptionalVoice(): VoiceContextValue | null {
    return useContext(VoiceContext);
}

