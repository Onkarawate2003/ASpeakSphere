"use client";

type VoiceWaveformProps = {
    /** Whether the waveform should animate (recording or AI speaking). */
    isActive: boolean;
    /** Number of bars to render. Defaults to 28. */
    bars?: number;
};

/**
 * CSS-only animated waveform.
 *
 * Renders a row of vertical bars that bounce up and down via the
 * `spk-wave-bar` keyframe when `isActive` is true. Each bar gets a
 * staggered `animationDelay` so the bars ripple left-to-right like a
 * real audio visualizer.
 *
 * No canvas, no Web Audio API — purely decorative CSS animation.
 * When inactive the bars collapse to thin flat lines.
 */
export default function VoiceWaveform({
    isActive,
    bars = 28,
}: VoiceWaveformProps) {
    return (
        <div
            className="flex h-16 items-center justify-center gap-1"
            role="img"
            aria-label={
                isActive
                    ? "Voice waveform — active"
                    : "Voice waveform — idle"
            }
        >
            {Array.from({ length: bars }).map((_, index) => (
                <span
                    key={index}
                    className={`w-1 rounded-full transition-colors duration-300 ${isActive
                            ? "spk-wave-bar bg-gradient-to-t from-blue-400 to-indigo-500"
                            : "bg-slate-200"
                        }`}
                    style={
                        isActive
                            ? {
                                animationDelay: `${(index % 8) * 0.08}s`,
                                height: "100%",
                                transformOrigin: "center",
                            }
                            : { height: "4px" }
                    }
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}
