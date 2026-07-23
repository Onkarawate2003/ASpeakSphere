"use client";

import { Info, Keyboard, Sparkles } from "lucide-react";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useVoice } from "@/features/conversation/VoiceContext";

import VoiceWaveform from "@/components/conversation/VoiceWaveform";
import SessionStatus, {
    useSessionStatusLabel,
} from "@/components/conversation/SessionStatus";

/** Hard cap on a single recording (seconds) before auto-processing. */
const MAX_RECORDING_SECONDS = 30;

/**
 * Voice Conversation Panel — Phase 11.5 Real-Time Voice Conversation.
 *
 * Real voice flow (unchanged):
 *
 *   idle → recording → processing → aiSpeaking → idle
 *
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
 * Phase 2 content cleanup:
 * The microphone button, recording timer, and Pause/Replay/Mute playback
 * row previously rendered here have been removed. `PremiumMicrophone`
 * (main column) is now the single microphone entry point, and
 * `AIResponseCard` (main column) is now the single playback-control
 * surface. Both still read from the exact same shared `useVoice()` state —
 * nothing about the recording/transcription/playback pipeline changed,
 * only which component renders the controls for it. This panel keeps its
 * unique content: the live waveform and the session-status badge/hint
 * copy, so nothing here is shown twice elsewhere on the screen.
 */
export default function VoiceConversationPanel() {
    const { status, isCompleted } = useConversation();
    const { voiceState, ttsEnabled, playbackState } = useVoice();

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
