"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import {
    BookOpen,
    Copy,
    Globe,
    Languages,
    Loader2,
    Quote,
    Search,
    Sparkles,
    Split,
    Star,
    Tag,
    Type,
    Volume2,
    AlertCircle,
    HelpCircle,
    CheckCircle2,
} from "lucide-react";

import { DashboardLayout, PersonalizedDailyWordCard } from "@/components/dashboard";
import {
    searchVocabulary,
    saveWord,
    unsaveWord,
    getSaveStatus,
    VocabularySearchResponse,
} from "@/features/vocabulary/api";
import {
    translateText,
    TRANSLATION_LANGUAGES,
    type TranslationLanguage,
} from "@/features/conversation/translationApi";
import { synthesizeSpeech } from "@/features/conversation/speechApi";

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------
type ToastVariant = "success" | "error";
interface ToastState {
    message: string;
    variant: ToastVariant;
    id: number;
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3000);
        return () => clearTimeout(t);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${
                toast.variant === "success"
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
            }`}
            role="status"
            aria-live="polite"
        >
            {toast.variant === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {toast.message}
        </div>
    );
}

// ---------------------------------------------------------------------------
// TranslatableCard
// ---------------------------------------------------------------------------
type TranslatableCardProps = {
    title: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    text: string;
    isItalic?: boolean;
    colSpan?: string;
    textStyle?: string;
    audioText?: string;
};

function TranslatableCard({
    title,
    icon,
    iconBg,
    iconColor,
    text,
    isItalic = false,
    colSpan = "sm:col-span-2 lg:col-span-3",
    textStyle = "mt-3 text-lg leading-7 text-slate-800",
    audioText,
}: TranslatableCardProps) {
    const [selectedLanguage, setSelectedLanguage] = useState<TranslationLanguage>("hi");
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const [translationError, setTranslationError] = useState<string | null>(null);

    const [audioLoading, setAudioLoading] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);

    const translationCacheRef = useRef<Map<string, string>>(new Map());
    const audioCacheRef = useRef<Map<string, string>>(new Map());
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            audioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
            audioCacheRef.current.clear();
        };
    }, []);

    useEffect(() => {
        setTranslatedText(null);
        setTranslationError(null);
        setAudioError(null);
        setAudioPlaying(false);
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
    }, [text]);

    const getTranslationCacheKey = (lang: TranslationLanguage) => `${text}:${lang}`;

    const handleTranslate = async (targetLang: TranslationLanguage = selectedLanguage) => {
        setTranslationError(null);
        const key = getTranslationCacheKey(targetLang);
        if (translationCacheRef.current.has(key)) {
            setTranslatedText(translationCacheRef.current.get(key)!);
            return;
        }
        setTranslating(true);
        try {
            const res = await translateText({ text, target_language: targetLang });
            const resultText = res.translated_text || "";
            translationCacheRef.current.set(key, resultText);
            setTranslatedText(resultText);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Translation failed. Please try again.";
            setTranslationError(msg);
        } finally {
            setTranslating(false);
        }
    };

    const handleLanguageChange = (newLang: TranslationLanguage) => {
        setSelectedLanguage(newLang);
        setTranslationError(null);
        const key = getTranslationCacheKey(newLang);
        if (translationCacheRef.current.has(key)) {
            setTranslatedText(translationCacheRef.current.get(key)!);
        } else if (translatedText !== null) {
            handleTranslate(newLang);
        }
    };

    const handlePlayAudio = async () => {
        if (!audioText || audioLoading) return;
        setAudioError(null);
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }
        const cleanWord = audioText.trim().toLowerCase();
        let objectUrl = audioCacheRef.current.get(cleanWord);
        if (!objectUrl) {
            setAudioLoading(true);
            try {
                const arrayBuffer = await synthesizeSpeech({ text: audioText });
                const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
                objectUrl = URL.createObjectURL(blob);
                audioCacheRef.current.set(cleanWord, objectUrl);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Pronunciation synthesis failed. Please try again.";
                setAudioError(msg);
                setAudioLoading(false);
                return;
            } finally {
                setAudioLoading(false);
            }
        }
        const audio = new Audio(objectUrl);
        currentAudioRef.current = audio;
        audio.onplay = () => setAudioPlaying(true);
        audio.onended = () => setAudioPlaying(false);
        audio.onerror = () => {
            setAudioPlaying(false);
            setAudioError("Playback failed. Tap the speaker to retry.");
        };
        try { await audio.play(); } catch { setAudioPlaying(false); }
    };

    const selectedOption = TRANSLATION_LANGUAGES.find((l) => l.code === selectedLanguage) || TRANSLATION_LANGUAGES[0];

    return (
        <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md ${colSpan}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={selectedLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value as TranslationLanguage)}
                            disabled={translating}
                            aria-label={`Select translation language for ${title}`}
                            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 cursor-pointer"
                        >
                            {TRANSLATION_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
                            ))}
                        </select>
                        <Languages className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                    <button
                        type="button"
                        onClick={() => handleTranslate(selectedLanguage)}
                        disabled={translating}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60"
                        title={`Translate ${title} into ${selectedOption.label}`}
                    >
                        {translating ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /><span>Translating...</span></>
                        ) : (
                            <><Globe className="h-3.5 w-3.5" aria-hidden="true" /><span>Translate</span></>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <div className={textStyle}>
                    {isItalic ? `\u201C${text}\u201D` : text}
                </div>
                {audioText && (
                    <button
                        type="button"
                        onClick={handlePlayAudio}
                        disabled={audioLoading}
                        aria-label={`Pronounce "${text}"`}
                        title={`Pronounce "${text}"`}
                        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60 ${
                            audioPlaying
                                ? "border-blue-300 bg-blue-100 text-blue-700 animate-pulse shadow-md"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                    >
                        {audioLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
                        ) : (
                            <Volume2 className={`h-5 w-5 ${audioPlaying ? "text-blue-700" : "text-slate-600"}`} aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>

            {audioError && (
                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{audioError}</span>
                </div>
            )}
            {translationError && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{translationError}</span>
                </div>
            )}
            {translatedText && !translating && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 transition">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                            <span aria-hidden="true">{selectedOption.flag}</span>
                            {selectedOption.label} Translation
                        </p>
                        <button
                            type="button"
                            onClick={() => setTranslatedText(null)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                        >
                            Hide
                        </button>
                    </div>
                    <p className="text-base leading-relaxed font-medium text-slate-800">{translatedText}</p>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VocabularyCoachPage
// ---------------------------------------------------------------------------
export default function VocabularyCoachPage() {
    const [wordInput, setWordInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [result, setResult] = useState<VocabularySearchResponse | null>(null);

    // Save state
    const [isSaved, setIsSaved] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState<ToastState | null>(null);
    const toastIdRef = useRef(0);

    const showToast = (message: string, variant: ToastVariant) => {
        toastIdRef.current += 1;
        setToast({ message, variant, id: toastIdRef.current });
    };

    // When a new valid word result arrives, check its saved status
    useEffect(() => {
        if (!result || result.is_valid_word === false) {
            setIsSaved(false);
            return;
        }
        let cancelled = false;
        getSaveStatus(result.word).then((s) => {
            if (!cancelled) setIsSaved(s.is_saved);
        }).catch(() => {
            // Non-critical — fail silently; star defaults to unsaved
        });
        return () => { cancelled = true; };
    }, [result]);

    const executeSearch = async (targetWord: string) => {
        setValidationError(null);
        setApiError(null);
        setLoading(true);
        setResult(null);
        setIsSaved(false);
        try {
            const data = await searchVocabulary(targetWord);
            setResult(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
            setApiError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        setApiError(null);
        const trimmedWord = wordInput.trim();
        if (!trimmedWord) {
            setValidationError("Please enter an English word.");
            return;
        }
        await executeSearch(trimmedWord);
    };

    const handleToggleSave = async () => {
        if (!result || result.is_valid_word === false || saveLoading) return;

        const previousState = isSaved;
        // Optimistic update
        setIsSaved(!isSaved);
        setSaveLoading(true);

        try {
            if (previousState) {
                // Remove
                await unsaveWord(result.word);
                showToast("Word removed.", "success");
            } else {
                // Save
                await saveWord({
                    word: result.word,
                    pronunciation: result.pronunciation,
                    part_of_speech: result.part_of_speech,
                    meaning: result.meaning,
                    example: result.example,
                    synonyms: result.synonyms ?? [],
                    antonyms: result.antonyms ?? [],
                });
                showToast("Word saved.", "success");
            }
        } catch (err: unknown) {
            // Revert optimistic update on failure
            setIsSaved(previousState);
            const message = err instanceof Error ? err.message : "Action failed. Please try again.";
            showToast(message, "error");
        } finally {
            setSaveLoading(false);
        }
    };

    const hasSynonyms = Boolean(result?.synonyms && result.synonyms.length > 0);
    const hasAntonyms = Boolean(result?.antonyms && result.antonyms.length > 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Toast */}
                {toast && (
                    <Toast
                        toast={toast}
                        onDismiss={() => setToast(null)}
                    />
                )}

                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
                    <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden="true" />
                    <div className="relative space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                            Vocabulary Coach
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Vocabulary Coach</h1>
                            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                                Learn the meaning, pronunciation, and usage of English words.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Personalized Daily Word Card */}
                <PersonalizedDailyWordCard
                    onSearchWord={(word) => {
                        setWordInput(word);
                        executeSearch(word);
                    }}
                />

                {/* Search Form */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    type="text"
                                    value={wordInput}
                                    onChange={(e) => {
                                        setWordInput(e.target.value);
                                        if (validationError) setValidationError(null);
                                    }}
                                    placeholder="Enter an English word..."
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Searching...</>
                                ) : (
                                    <><Search className="h-5 w-5" aria-hidden="true" />Search</>
                                )}
                            </button>
                        </div>
                        {validationError && (
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>{validationError}</span>
                            </div>
                        )}
                    </form>
                </section>

                {/* API Error */}
                {apiError && (
                    <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-rose-800 shadow-sm">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />
                            <p className="text-sm font-medium">{apiError}</p>
                        </div>
                    </section>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className="h-32 rounded-3xl border border-slate-200 bg-slate-100" />
                        ))}
                    </div>
                )}

                {/* Invalid Word State */}
                {result && !loading && result.is_valid_word === false && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <HelpCircle className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-slate-900">Word not found</h3>
                        <p className="mt-2 text-base text-slate-600 max-w-md mx-auto">
                            {result.error_message || "The entered word is not recognised as a standard English word."}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            Please check the spelling or try searching for another word.
                        </p>
                    </section>
                )}

                {/* Valid Word Cards */}
                {result && !loading && result.is_valid_word !== false && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Word Card (Translatable + Speaker + Save Star) */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:col-span-1 lg:col-span-1">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                        <Type className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Word</span>
                                </div>
                                {/* Save Star Button */}
                                <button
                                    type="button"
                                    onClick={handleToggleSave}
                                    disabled={saveLoading}
                                    aria-label={isSaved ? `Remove "${result.word}" from saved words` : `Save "${result.word}"`}
                                    title={isSaved ? "Remove from saved words" : "Save word"}
                                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:cursor-wait disabled:opacity-60 ${
                                        isSaved
                                            ? "border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100"
                                            : "border-slate-200 bg-slate-50 text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-400"
                                    }`}
                                >
                                    {saveLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <Star
                                            className="h-5 w-5"
                                            fill={isSaved ? "currentColor" : "none"}
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Word text + Speaker button row */}
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <h2 className="text-2xl font-bold text-slate-900">{result.word}</h2>
                                <TranslatableCardAudio word={result.word} />
                            </div>
                        </div>

                        {/* Pronunciation Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                    <Volume2 className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Pronunciation</span>
                            </div>
                            <p className="mt-4 text-xl font-medium tracking-wide text-indigo-700 font-mono">
                                {result.pronunciation}
                            </p>
                        </div>

                        {/* Part of Speech Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                    <Tag className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Part of Speech</span>
                            </div>
                            <p className="mt-4 text-xl font-bold text-slate-900 capitalize">{result.part_of_speech}</p>
                        </div>

                        {/* Meaning Card (Translatable) */}
                        <TranslatableCard
                            title="Meaning"
                            icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            text={result.meaning}
                        />

                        {/* Example Sentence Card (Translatable) */}
                        <TranslatableCard
                            title="Example Sentence"
                            icon={<Quote className="h-5 w-5" aria-hidden="true" />}
                            iconBg="bg-purple-50"
                            iconColor="text-purple-600"
                            text={result.example}
                            isItalic
                        />

                        {/* Synonyms Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-3">
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                    <Copy className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Synonyms</span>
                            </div>
                            <div className="mt-4">
                                {hasSynonyms ? (
                                    <div className="flex flex-wrap gap-2">
                                        {result.synonyms!.map((syn, idx) => (
                                            <span key={idx} className="inline-flex items-center rounded-2xl border border-sky-100 bg-sky-50 px-3.5 py-1.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                                                {syn}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-slate-500">No synonyms available.</p>
                                )}
                            </div>
                        </div>

                        {/* Antonyms Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-3">
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                    <Split className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Antonyms</span>
                            </div>
                            <div className="mt-4">
                                {hasAntonyms ? (
                                    <div className="flex flex-wrap gap-2">
                                        {result.antonyms!.map((ant, idx) => (
                                            <span key={idx} className="inline-flex items-center rounded-2xl border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                                                {ant}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-slate-500">No antonyms available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// ---------------------------------------------------------------------------
// Isolated speaker button component (keeps audio state out of Word Card)
// ---------------------------------------------------------------------------
function TranslatableCardAudio({ word }: { word: string }) {
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioCacheRef = useRef<Map<string, string>>(new Map());
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (currentAudioRef.current) currentAudioRef.current.pause();
            audioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
            audioCacheRef.current.clear();
        };
    }, []);

    // Stop any playing audio when the word changes
    useEffect(() => {
        setAudioError(null);
        setAudioPlaying(false);
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
    }, [word]);

    const handlePlayAudio = async () => {
        if (audioLoading) return;
        setAudioError(null);
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }
        const cacheKey = word.trim().toLowerCase();
        let objectUrl = audioCacheRef.current.get(cacheKey);
        if (!objectUrl) {
            setAudioLoading(true);
            try {
                const buf = await synthesizeSpeech({ text: word });
                const blob = new Blob([buf], { type: "audio/mpeg" });
                objectUrl = URL.createObjectURL(blob);
                audioCacheRef.current.set(cacheKey, objectUrl);
            } catch (err: unknown) {
                setAudioError(err instanceof Error ? err.message : "Synthesis failed. Tap to retry.");
                setAudioLoading(false);
                return;
            } finally {
                setAudioLoading(false);
            }
        }
        const audio = new Audio(objectUrl);
        currentAudioRef.current = audio;
        audio.onplay = () => setAudioPlaying(true);
        audio.onended = () => setAudioPlaying(false);
        audio.onerror = () => { setAudioPlaying(false); setAudioError("Playback failed. Tap to retry."); };
        try { await audio.play(); } catch { setAudioPlaying(false); }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handlePlayAudio}
                disabled={audioLoading}
                aria-label={`Pronounce "${word}"`}
                title={`Pronounce "${word}"`}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60 ${
                    audioPlaying
                        ? "border-blue-300 bg-blue-100 text-blue-700 animate-pulse shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                }`}
            >
                {audioLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
                ) : (
                    <Volume2 className={`h-5 w-5 ${audioPlaying ? "text-blue-700" : "text-slate-600"}`} aria-hidden="true" />
                )}
            </button>
            {audioError && (
                <p className="text-xs font-medium text-rose-600 max-w-[120px] text-right">{audioError}</p>
            )}
        </div>
    );
}
