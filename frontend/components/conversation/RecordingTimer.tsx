"use client";

import { formatTimer } from "@/features/conversation/utils";

type RecordingTimerProps = {
    /** Elapsed recording seconds (simulated, driven by parent state). */
    seconds: number;
    /** Whether a recording is currently in progress. */
    isActive: boolean;
};

/**
 * Simulated recording timer.
 *
 * Displays a "Recording" label with a pulsing red dot and a `MM:SS`
 * counter. No real microphone is involved — the parent component
 * increments `seconds` via `setInterval` while `isActive` is true.
 *
 * Reuses the existing `formatTimer` helper from the conversation
 * utils so the format stays consistent with the session timer.
 */
export default function RecordingTimer({
    seconds,
    isActive,
}: RecordingTimerProps) {
    return (
        <div
            className="flex items-center gap-2"
            role="timer"
            aria-live="polite"
            aria-label={
                isActive
                    ? `Recording, ${formatTimer(seconds)} elapsed`
                    : "Recording timer ready"
            }
        >
            <span
                className={`h-2.5 w-2.5 rounded-full transition-colors ${isActive ? "animate-pulse bg-red-500" : "bg-slate-300"
                    }`}
                aria-hidden="true"
            />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {isActive ? "Recording" : "Ready"}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-slate-900">
                {formatTimer(seconds)}
            </span>
        </div>
    );
}
