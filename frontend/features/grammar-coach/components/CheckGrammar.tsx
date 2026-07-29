"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/features/auth/api";
import { useTtsPlayback } from "@/features/conversation/useTtsPlayback";
import { checkGrammar, type GrammarCheckResponse, type GrammarSeverity } from "../api";

const MAX_CHARACTERS = 1000;

const severityStyles: Record<GrammarSeverity, string> = {
    low: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-rose-50 text-rose-700",
};

export default function CheckGrammar() {
    const [sentence, setSentence] = useState("");
    const [feedback, setFeedback] = useState<GrammarCheckResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestPendingRef = useRef(false);

    const handleCheckGrammar = async () => {
        const cleanedSentence = sentence.trim();
        if (!cleanedSentence || requestPendingRef.current) return;

        requestPendingRef.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const result = await checkGrammar(cleanedSentence);
            setFeedback(result);
        } catch (err) {
            setFeedback(null);
            setError(
                err instanceof ApiError
                    ? err.detail || "Grammar check failed."
                    : "Unable to reach the grammar service. Check your connection and try again.",
            );
        } finally {
            requestPendingRef.current = false;
            setIsLoading(false);
        }
    };

    const clear = () => {
        setSentence("");
        setFeedback(null);
        setError(null);
    };

    return (
        <section
            id="check-grammar-panel"
            role="tabpanel"
            aria-labelledby="check-grammar-tab"
            className="space-y-5"
        >
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <header>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        Check Your Grammar
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                        Enter an English sentence to receive grammar feedback.
                    </p>
                </header>

                <div className="mt-5 sm:mt-6">
                    <label htmlFor="grammar-check-input" className="mb-2 block text-sm font-bold text-slate-800">
                        English sentence
                    </label>
                    <textarea
                        id="grammar-check-input"
                        value={sentence}
                        onChange={(event) => setSentence(event.target.value)}
                        onKeyDown={(event) => {
                            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                                event.preventDefault();
                                void handleCheckGrammar();
                            }
                        }}
                        maxLength={MAX_CHARACTERS}
                        rows={7}
                        aria-describedby="grammar-check-hint grammar-character-count"
                        aria-invalid={Boolean(error)}
                        placeholder="Example: Yesterday I go to office with my friend."
                        className="min-h-40 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:min-h-44 sm:text-base"
                    />
                    <div className="mt-2 flex items-start justify-between gap-3 text-xs font-semibold text-slate-500">
                        <p id="grammar-check-hint">Press Ctrl+Enter or ⌘+Enter to check.</p>
                        <p id="grammar-character-count" className="shrink-0 text-right" aria-live="polite">
                            {sentence.length} / {MAX_CHARACTERS}
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => void handleCheckGrammar()}
                        disabled={!sentence.trim() || isLoading}
                        aria-busy={isLoading}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                        {isLoading ? "Checking Grammar…" : "Check Grammar"}
                    </button>
                    <button
                        type="button"
                        onClick={clear}
                        disabled={isLoading || (!sentence && !feedback && !error)}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Clear
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert">
                        <p className="text-sm leading-6 text-rose-700">{error}</p>
                        <button
                            type="button"
                            onClick={() => void handleCheckGrammar()}
                            disabled={!sentence.trim() || isLoading}
                            className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>

            <div aria-live="polite" aria-atomic="false">
                {feedback && (
                    <GrammarResult
                        key={feedback.corrected_sentence}
                        feedback={feedback}
                    />
                )}
            </div>
        </section>
    );
}

function GrammarResult({ feedback }: { feedback: GrammarCheckResponse }) {
    const {
        ttsEnabled,
        playbackState,
        speak,
        stop,
        ensureAudioElement,
    } = useTtsPlayback();
    const requestPendingRef = useRef(false);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);
    const isPlaybackBusy = playbackState === "loading" || playbackState === "playing";

    useEffect(() => {
        return () => {
            stop();
            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        };
    }, [stop]);

    const listenToCorrection = async () => {
        if (!ttsEnabled || isPlaybackBusy || requestPendingRef.current) return;

        requestPendingRef.current = true;
        ensureAudioElement();
        try {
            await speak("grammar-corrected-sentence", feedback.corrected_sentence);
        } finally {
            requestPendingRef.current = false;
        }
    };

    const copyCorrection = async () => {
        setCopyError(null);
        try {
            await navigator.clipboard.writeText(feedback.corrected_sentence);
            setIsCopied(true);
            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
            copiedTimerRef.current = setTimeout(() => {
                setIsCopied(false);
                copiedTimerRef.current = null;
            }, 2000);
        } catch {
            setIsCopied(false);
            setCopyError("The corrected sentence could not be copied. Please try again.");
        }
    };

    return (
        <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <header className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Grammar Result</p>
                    <h2 className="mt-1 text-xl font-extrabold text-slate-900">Your Feedback</h2>
                </div>
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <span className="text-2xl font-extrabold">{feedback.grammar_score}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Score</span>
                </div>
            </header>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <SentenceCard title="Original Sentence" sentence={feedback.original_sentence} />
                <div>
                    <SentenceCard title="Corrected Sentence" sentence={feedback.corrected_sentence} corrected />
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => void listenToCorrection()}
                            disabled={!ttsEnabled || isPlaybackBusy}
                            aria-busy={playbackState === "loading"}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                            {playbackState === "loading"
                                ? "Generating..."
                                : playbackState === "playing"
                                    ? "Playing..."
                                    : "🔊 Listen"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void copyCorrection()}
                            aria-label={isCopied ? "Corrected sentence copied" : "Copy corrected sentence"}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                            <span aria-hidden="true">{isCopied ? "" : "📋 "}</span>{isCopied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    {playbackState === "error" && (
                        <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
                            The corrected sentence could not be played. Please try again.
                        </p>
                    )}
                    {copyError && (
                        <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
                            {copyError}
                        </p>
                    )}
                </div>
            </div>

            <section className="mt-5 rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-extrabold text-slate-900">Overall Feedback</h3>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">Tone: {feedback.tone}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feedback.overall_feedback}</p>
            </section>

            <section className="mt-6">
                <h3 className="text-xl font-extrabold text-slate-900">Corrections</h3>
                {feedback.corrections.length > 0 ? (
                    <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-2">
                        {feedback.corrections.map((correction, index) => (
                            <CorrectionCard key={`${correction.incorrect}-${correction.correct}-${index}`} correction={correction} />
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                        No corrections needed. Your sentence looks good.
                    </p>
                )}
            </section>
        </article>
    );
}

function SentenceCard({ title, sentence, corrected = false }: { title: string; sentence: string; corrected?: boolean }) {
    return (
        <section className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${corrected ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
            <h3 className={`text-sm font-extrabold ${corrected ? "text-emerald-800" : "text-slate-700"}`}>{title}</h3>
            <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere] ${corrected ? "text-emerald-900" : "text-slate-600"}`}>{sentence}</p>
        </section>
    );
}

function CorrectionCard({ correction }: { correction: GrammarCheckResponse["corrections"][number] }) {
    return (
        <article className="h-full min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{correction.rule}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${severityStyles[correction.severity]}`}>{correction.severity}</span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="font-bold text-rose-700">Incorrect</dt><dd className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">{correction.incorrect}</dd></div>
                <div><dt className="font-bold text-emerald-700">Correct</dt><dd className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">{correction.correct}</dd></div>
                <div><dt className="font-bold text-slate-800">Simple Explanation</dt><dd className="mt-1 break-words leading-6 text-slate-600 [overflow-wrap:anywhere]">{correction.reason}</dd></div>
            </dl>
        </article>
    );
}
