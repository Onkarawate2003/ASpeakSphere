"use client";

import {
    Info,
    Keyboard,
    Pause,
    Play,
    RotateCcw,
    Sparkles,
    Volume2,
    VolumeX,
} from "lucide-react";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useVoice } from "@/features/conversation/VoiceContext";

import MicrophoneButton from "@/components/conversation/MicrophoneButton";
import RecordingTimer from "@/components/conversation/RecordingTimer";
import VoiceWaveform from "@/components/conversation/VoiceWaveform";
import SessionStatus, {
    useSessionStatusLabel,
} from "@/components/conversation/SessionStatus";

/** Hard cap on a single recording (seconds) before auto-processing. */
const MAX_RECORDING_SECONDS = 30;

/**
 * Voice Conversation Panel — Phase 11.5 Real-Time Voice Conversation.
 *
 * Replaces the previous frontend-only simulation with a real voice flow:
 *
 *   idle → recording → processing → aiSpeaking → idle
 *
 * Flow:
 *   1. Tap the microphone → `useAudioRecorder` (in `VoiceContext`) starts
 *      capturing audio from the microphone (with permission handling).
 *   2. Tap again (or wait for the cap) → recording stops, producing a Blob.
 *   3. The Blob is uploaded to `POST /api/v1/speech/transcribe` (Groq
 *      Whisper) and the transcript text is returned.
 *   4. The transcript is inserted into the **existing** conversation
 *      pipeline via `sendMessage()` — exactly as if the learner typed it.
 *      No conversation logic is duplicated.
 *   5. Emma's reply is auto-spoken by `VoiceProvider` (TTS) — the panel
 *      reflects the `aiSpeaking` state while audio plays.
 *
 * The recorder + transcription orchestration lives in `VoiceContext` so
 * that both this sidebar panel and the compact mic button in
 * `ConversationInput` share a single recording state machine (Part 10:
 * avoid duplicate logic). This component is now purely presentational —
 * it renders the shared `voiceState`, `recorderSeconds`, and
 * `handleMicClick` from `useVoice()`.
 *
 * Error handling (Part 7) is centralised in `VoiceContext`:
 *   - Microphone permission denied → toast + return to idle.
 *   - Empty/unintelligible speech → toast + return to idle.
 *   - STT/TTS API failures → toast + return to idle; the text pipeline is
 *     never broken.
 *
 * The panel is disabled before the session starts and after it ends.
 */
export default function VoiceConversationPanel() {
    const { status, isCompleted } = useConversation();
    const {
        voiceState,
        recorderSeconds,
        handleMicClick,
        ttsEnabled,
        playbackState,
        isMuted,
        activeMessageId,
        pause,
        resume,
        replay,
        toggleMute,
    } = useVoice();

    const sessionActive = status === "active";
    const sessionEnded = status === "ended" || isCompleted;
    const micDisabled = !sessionActive || sessionEnded;

    // Keep the status label string for the accessible live region.
    const statusLabel = useSessionStatusLabel(voiceState);

    const isRecording = voiceState === "recording";
    const waveformActive =
        isRecording ||
        voiceState === "aiSpeaking" ||
        playbackState === "loading";

    // TTS playback controls are shown when audio is loaded for the active
    // reply (playing/paused/ended) and TTS is enabled.
    const showPlaybackControls =
        ttsEnabled &&
        activeMessageId !== null &&
        (playbackState === "playing" ||
            playbackState === "paused" ||
            playbackState === "ended");

    return (
        <section
            className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="Voice conversation panel"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles
                        className="h-4 w-4 text-indigo-600"
                        aria-hidden="true"
                    />
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                        Voice Conversation
                    </h2>
                </div>
                <SessionStatus voiceState={voiceState} />
            </div>

            {/* Accessible live region — announces status changes politely. */}
            <span className="sr-only" aria-live="polite" role="status">
                {statusLabel}
            </span>

            {/* Waveform area */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <VoiceWaveform isActive={waveformActive} />
            </div>

            {/* Microphone + recording timer */}
            <div className="flex flex-col items-center gap-3">
                <MicrophoneButton
                    state={voiceState}
                    onClick={handleMicClick}
                    disabled={micDisabled}
                />
                <RecordingTimer
                    seconds={recorderSeconds}
                    isActive={isRecording}
                />
            </div>

            {/* TTS playback controls — play/pause/replay/mute for the
                newest AI reply. Only shown when TTS is available and audio
                is loaded. */}
            {showPlaybackControls && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    {playbackState === "playing" ? (
                        <button
                            type="button"
                            onClick={pause}
                            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                            aria-label="Pause Emma's voice"
                        >
                            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            Pause
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={resume}
                            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                            aria-label="Play Emma's voice"
                        >
                            <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            Play
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={replay}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                        aria-label="Replay Emma's voice"
                    >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Replay
                    </button>
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                        aria-label={isMuted ? "Unmute voice" : "Mute voice"}
                    >
                        {isMuted ? (
                            <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {isMuted ? "Unmute" : "Mute"}
                    </button>
                </div>
            )}

            {/* Voice controls / hint section */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Voice Controls
                </p>

                {micDisabled ? (
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                        <Info
                            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                            aria-hidden="true"
                        />
                        <span>
                            {sessionEnded
                                ? "This practice session has ended. Start a new session to use voice mode."
                                : "Start the conversation to enable voice mode."}
                        </span>
                    </p>
                ) : (
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-500">
                        <li className="flex items-start gap-2">
                            <Keyboard
                                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                                aria-hidden="true"
                            />
                            <span>
                                Tap the microphone to start recording. Tap
                                again (or wait {MAX_RECORDING_SECONDS}s) to
                                stop and send your speech.
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Info
                                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                                aria-hidden="true"
                            />
                            <span>
                                {ttsEnabled
                                    ? "Your speech is transcribed and sent to Emma. Her reply is spoken aloud automatically."
                                    : "Your speech is transcribed and sent to Emma. Voice playback is not configured — her reply appears as text."}
                            </span>
                        </li>
                    </ul>
                )}
            </div>
        </section>
    );
}
