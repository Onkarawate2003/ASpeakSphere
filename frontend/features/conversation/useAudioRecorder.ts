"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Supported audio MIME types, in order of preference. The first type the
 * browser reports as supported is used so the backend (Groq Whisper) gets a
 * container it can decode. `webm` is preferred (Chrome/Firefox); `mp4`/`ogg`
 * cover Safari and other engines.
 */
const PREFERRED_MIME_TYPES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/ogg",
];

/**
 * Pick the best supported audio MIME type for the current browser.
 * Returns `null` when MediaRecorder is unavailable or no preferred type is
 * supported.
 */
function pickSupportedMimeType(): string | null {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
        return null;
    }
    for (const type of PREFERRED_MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return null;
}

/** Maps a MIME type to a file extension for the upload filename. */
function mimeToExtension(mime: string): string {
    if (mime.includes("webm")) return "webm";
    if (mime.includes("mp4")) return "mp4";
    if (mime.includes("ogg")) return "ogg";
    if (mime.includes("mpeg")) return "mp3";
    if (mime.includes("wav")) return "wav";
    return "webm";
}

/** Error thrown when the microphone cannot be accessed. */
export class MicrophoneError extends Error {
    /** A short, user-facing reason code: "denied" | "unavailable" | "unknown". */
    reason: "denied" | "unavailable" | "unknown";

    constructor(
        reason: "denied" | "unavailable" | "unknown",
        message: string,
    ) {
        super(message);
        this.name = "MicrophoneError";
        this.reason = reason;
    }
}

export type AudioRecorderState = "idle" | "recording";

export type AudioRecorderResult = {
    /** Current recorder state. */
    state: AudioRecorderState;
    /** Elapsed recording time in seconds (for the timer UI). */
    seconds: number;
    /** Whether the browser supports audio recording at all. */
    isSupported: boolean;
    /**
     * Start recording from the microphone. Resolves once recording has
     * begun. Throws `MicrophoneError` on permission denial or when no mic
     * is available.
     */
    startRecording: () => Promise<void>;
    /**
     * Stop recording and resolve with the captured audio Blob (with the
     * correct MIME type). Resolves with `null` if nothing was captured.
     */
    stopRecording: () => Promise<{ blob: Blob; filename: string } | null>;
    /** Cancel recording without producing audio (discards the buffer). */
    cancelRecording: () => void;
};

/**
 * Hook that wraps the browser MediaRecorder API into a clean state machine.
 *
 * Responsibilities:
 *  - Request microphone access (with a clear error on denial).
 *  - Pick the best supported audio codec.
 *  - Track elapsed seconds for the recording timer.
 *  - Produce a Blob + filename ready for upload to the STT endpoint.
 *  - Clean up the stream and recorder on unmount.
 *
 * The hook is intentionally UI-agnostic: it does not render anything or
 * manage the broader voice state machine (processing / aiSpeaking). Those
 * concerns live in the VoiceConversationPanel, which composes this hook
 * with the conversation context.
 *
 * @param maxSeconds Hard cap on recording duration (auto-stops at this point).
 */
export function useAudioRecorder(maxSeconds: number): AudioRecorderResult {
    const [state, setState] = useState<AudioRecorderState>("idle");
    const [seconds, setSeconds] = useState<number>(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mimeTypeRef = useRef<string | null>(null);
    const stopResolverRef = useRef<
        ((value: { blob: Blob; filename: string } | null) => void) | null
    >(null);

    const isSupported =
        typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices;

    /** Stop the interval timer that drives `seconds`. */
    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    /** Tear down the MediaRecorder and release the microphone. */
    const cleanup = useCallback(() => {
        clearTimer();
        if (mediaRecorderRef.current) {
            try {
                if (mediaRecorderRef.current.state !== "inactive") {
                    mediaRecorderRef.current.stop();
                }
            } catch {
                // Ignore — already stopped.
            }
            mediaRecorderRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        chunksRef.current = [];
    }, [clearTimer]);

    const startRecording = useCallback(async () => {
        if (!isSupported) {
            throw new MicrophoneError(
                "unavailable",
                "Audio recording is not supported in this browser.",
            );
        }
        // If already recording, ignore.
        if (mediaRecorderRef.current) return;

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
        } catch (err: unknown) {
            const name = (err as DOMException)?.name;
            if (name === "NotAllowedError" || name === "SecurityError") {
                throw new MicrophoneError(
                    "denied",
                    "Microphone access was denied. Please allow microphone access in your browser settings.",
                );
            }
            if (name === "NotFoundError" || name === "DevicesNotFoundError") {
                throw new MicrophoneError(
                    "unavailable",
                    "No microphone was found. Please connect a microphone and try again.",
                );
            }
            throw new MicrophoneError(
                "unknown",
                "Could not access the microphone. Please try again.",
            );
        }

        streamRef.current = stream;
        chunksRef.current = [];

        const mimeType = pickSupportedMimeType();
        mimeTypeRef.current = mimeType;

        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(
                stream,
                mimeType
                    ? { mimeType, audioBitsPerSecond: 128000 }
                    : { audioBitsPerSecond: 128000 },
            );
        } catch {
            // Fallback: construct without options if the chosen codec fails.
            recorder = new MediaRecorder(stream);
            mimeTypeRef.current = null;
        }

        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
            if (event.data && event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            const type = mimeTypeRef.current ?? "audio/webm";
            const blob = new Blob(chunksRef.current, { type });
            const ext = mimeToExtension(type);
            const filename = `recording.${ext}`;
            const result =
                blob.size > 0 ? { blob, filename } : null;
            chunksRef.current = [];
            if (stopResolverRef.current) {
                stopResolverRef.current(result);
                stopResolverRef.current = null;
            }
        };

        recorder.start();
        setState("recording");
        setSeconds(0);

        // Drive the timer + auto-stop at the cap.
        intervalRef.current = setInterval(() => {
            setSeconds((prev) => {
                const next = prev + 1;
                if (next >= maxSeconds) {
                    // Auto-stop when the cap is reached.
                    void stopRecordingInternal();
                }
                return next;
            });
        }, 1000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported, maxSeconds]);

    /** Internal stop that does not depend on `stopRecording` (avoids cycle). */
    const stopRecordingInternal = useCallback(():
        | Promise<{ blob: Blob; filename: string } | null> => {
        const recorder = mediaRecorderRef.current;
        clearTimer();
        if (!recorder) {
            setState("idle");
            return Promise.resolve(null);
        }
        if (recorder.state === "inactive") {
            // Already stopped; nothing to capture.
            mediaRecorderRef.current = null;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            setState("idle");
            return Promise.resolve(null);
        }
        return new Promise((resolve) => {
            stopResolverRef.current = resolve;
            try {
                recorder.stop();
            } catch {
                resolve(null);
            }
            // Release the mic immediately; the onstop handler builds the blob.
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            setState("idle");
        });
    }, [clearTimer]);

    const stopRecording = useCallback(() => {
        return stopRecordingInternal();
    }, [stopRecordingInternal]);

    const cancelRecording = useCallback(() => {
        clearTimer();
        stopResolverRef.current = null;
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            try {
                recorder.onstop = null;
                recorder.stop();
            } catch {
                // Ignore.
            }
        }
        mediaRecorderRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        chunksRef.current = [];
        setState("idle");
        setSeconds(0);
    }, [clearTimer]);

    /** Clean up everything on unmount. */
    useEffect(() => {
        return () => {
            clearTimer();
            if (mediaRecorderRef.current) {
                try {
                    if (mediaRecorderRef.current.state !== "inactive") {
                        mediaRecorderRef.current.stop();
                    }
                } catch {
                    // Ignore.
                }
                mediaRecorderRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, [clearTimer]);

    return {
        state,
        seconds,
        isSupported,
        startRecording,
        stopRecording,
        cancelRecording,
    };
}
