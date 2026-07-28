"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    BookOpen,
    Compass,
    Copy,
    Globe,
    Languages,
    Loader2,
    Quote,
    RefreshCw,
    Search,
    Sparkles,
    Split,
    Star,
    Tag,
    Target,
    Volume2,
} from "lucide-react";

import {
    getDailyWord,
    getSaveStatus,
    saveWord,
    unsaveWord,
    type PersonalizedDailyWordResponse,
} from "@/features/vocabulary/api";
import {
    translateText,
    TRANSLATION_LANGUAGES,
    type TranslationLanguage,
} from "@/features/conversation/translationApi";
import { synthesizeSpeech } from "@/features/conversation/speechApi";

type PersonalizedDailyWordCardProps = {
    /** Optional callback when user clicks "Search in Vocabulary Coach" */
    onSearchWord?: (word: string) => void;
};

export default function PersonalizedDailyWordCard({
    onSearchWord,
}: PersonalizedDailyWordCardProps) {
    const router = useRouter();

    const [dailyWord, setDailyWord] = useState<PersonalizedDailyWordResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Save star state
    const [isSaved, setIsSaved] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Pronunciation state
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioCacheRef = useRef<Map<string, string>>(new Map());
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Translation state for Meaning & Example
    const [selectedLanguage, setSelectedLanguage] = useState<TranslationLanguage>("hi");
    const [translatedMeaning, setTranslatedMeaning] = useState<string | null>(null);
    const [translatedExample, setTranslatedExample] = useState<string | null>(null);
    const [translatingMeaning, setTranslatingMeaning] = useState(false);
    const [translatingExample, setTranslatingExample] = useState(false);
    const [translationError, setTranslationError] = useState<string | null>(null);

    const translationCacheRef = useRef<Map<string, string>>(new Map());

    // Cleanup audio on unmount
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

    // Load today's personalized daily word
    const loadDailyWord = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDailyWord();
            setDailyWord(data);
            // Check save status for this word
            if (data?.word) {
                try {
                    const status = await getSaveStatus(data.word);
                    setIsSaved(status.is_saved);
                } catch {
                    setIsSaved(false);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load today's daily word.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDailyWord();
    }, []);

    // Toggle save star
    const handleToggleSave = async () => {
        if (!dailyWord || saveLoading) return;
        const previousState = isSaved;
        setIsSaved(!isSaved);
        setSaveLoading(true);
        try {
            if (previousState) {
                await unsaveWord(dailyWord.word);
            } else {
                await saveWord({
                    word: dailyWord.word,
                    pronunciation: dailyWord.pronunciation,
                    part_of_speech: dailyWord.part_of_speech,
                    meaning: dailyWord.meaning,
                    example: dailyWord.example,
                    synonyms: dailyWord.synonyms || [],
                    antonyms: dailyWord.antonyms || [],
                });
            }
        } catch {
            setIsSaved(previousState);
        } finally {
            setSaveLoading(false);
        }
    };

    // Pronounce audio
    const handlePlayAudio = async () => {
        if (!dailyWord?.word || audioLoading) return;
        setAudioError(null);
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }

        const cacheKey = dailyWord.word.trim().toLowerCase();
        let objectUrl = audioCacheRef.current.get(cacheKey);

        if (!objectUrl) {
            setAudioLoading(true);
            try {
                const arrayBuffer = await synthesizeSpeech({ text: dailyWord.word });
                const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
                objectUrl = URL.createObjectURL(blob);
                audioCacheRef.current.set(cacheKey, objectUrl);
            } catch (err: unknown) {
                setAudioError(err instanceof Error ? err.message : "Playback failed.");
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
            setAudioError("Playback failed.");
        };

        try {
            await audio.play();
        } catch {
            setAudioPlaying(false);
        }
    };

    // Translate Meaning or Example
    const handleTranslate = async (target: "meaning" | "example") => {
        if (!dailyWord) return;
        setTranslationError(null);
        const sourceText = target === "meaning" ? dailyWord.meaning : dailyWord.example;
        const key = `${sourceText}:${selectedLanguage}`;

        if (translationCacheRef.current.has(key)) {
            const cachedVal = translationCacheRef.current.get(key)!;
            if (target === "meaning") setTranslatedMeaning(cachedVal);
            else setTranslatedExample(cachedVal);
            return;
        }

        if (target === "meaning") setTranslatingMeaning(true);
        else setTranslatingExample(true);

        try {
            const res = await translateText({ text: sourceText, target_language: selectedLanguage });
            const val = res.translated_text || "";
            translationCacheRef.current.set(key, val);
            if (target === "meaning") setTranslatedMeaning(val);
            else setTranslatedExample(val);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Translation failed.";
            setTranslationError(msg);
        } finally {
            if (target === "meaning") setTranslatingMeaning(false);
            else setTranslatingExample(false);
        }
    };

    const handleSearchClick = () => {
        if (!dailyWord) return;
        if (onSearchWord) {
            onSearchWord(dailyWord.word);
        } else {
            router.push(`/dashboard/vocabulary?q=${encodeURIComponent(dailyWord.word)}`);
        }
    };

    const formattedDate = new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    const selectedLangOption = TRANSLATION_LANGUAGES.find((l) => l.code === selectedLanguage) || TRANSLATION_LANGUAGES[0];

    // Loading Skeleton
    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-44 rounded-full bg-slate-100" />
                    <div className="h-6 w-24 rounded-full bg-slate-100" />
                </div>
                <div className="h-10 w-48 rounded-2xl bg-slate-100" />
                <div className="h-6 w-3/4 rounded-xl bg-slate-100" />
                <div className="h-16 w-full rounded-2xl bg-slate-100" />
            </div>
        );
    }

    // Error State
    if (error || !dailyWord) {
        return (
            <div className="rounded-[2.5rem] border border-rose-200 bg-rose-50/60 p-6 text-center shadow-sm sm:p-8 space-y-3">
                <AlertCircle className="mx-auto h-8 w-8 text-rose-500" aria-hidden="true" />
                <p className="text-sm font-semibold text-rose-800">{error || "Could not load daily word."}</p>
                <button
                    type="button"
                    onClick={loadDailyWord}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <section className="relative overflow-hidden rounded-[2.5rem] border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 p-6 shadow-md transition sm:p-8">
            {/* Header Badges Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-100/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                        Recommended for You
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        <Compass className="h-3 w-3 text-slate-500" aria-hidden="true" />
                        {dailyWord.topic}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        <Target className="h-3 w-3 text-blue-500" aria-hidden="true" />
                        {dailyWord.learning_goal}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        Level: {dailyWord.level}
                    </span>
                </div>
                <span className="text-xs font-medium text-slate-400">{formattedDate}</span>
            </div>

            {/* Main Word Title & Quick Action Buttons */}
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl capitalize">{dailyWord.word}</h2>

                        {/* Pronounce Speaker Button */}
                        <button
                            type="button"
                            onClick={handlePlayAudio}
                            disabled={audioLoading}
                            aria-label={`Pronounce "${dailyWord.word}"`}
                            title={`Pronounce "${dailyWord.word}"`}
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60 ${
                                audioPlaying
                                    ? "border-blue-300 bg-blue-100 text-blue-700 animate-pulse shadow-md"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                        >
                            {audioLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
                            ) : (
                                <Volume2 className={`h-4.5 w-4.5 ${audioPlaying ? "text-blue-700" : "text-slate-600"}`} aria-hidden="true" />
                            )}
                        </button>

                        {/* Save Star Button */}
                        <button
                            type="button"
                            onClick={handleToggleSave}
                            disabled={saveLoading}
                            aria-label={isSaved ? `Remove "${dailyWord.word}" from saved words` : `Save "${dailyWord.word}"`}
                            title={isSaved ? "Remove from saved words" : "Save word"}
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:cursor-wait disabled:opacity-60 ${
                                isSaved
                                    ? "border-amber-300 bg-amber-100 text-amber-600 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500"
                            }`}
                        >
                            {saveLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Star className="h-4.5 w-4.5" fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    {audioError && <p className="mt-1 text-xs font-medium text-rose-600">{audioError}</p>}

                    {/* Pronunciation IPA & Part of speech */}
                    <div className="mt-2 flex items-center gap-3">
                        <span className="font-mono text-base font-semibold text-indigo-700 tracking-wide">{dailyWord.pronunciation}</span>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 capitalize">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {dailyWord.part_of_speech}
                        </span>
                    </div>
                </div>

                {/* Translation Controls & Search Quick Action */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value as TranslationLanguage)}
                            aria-label="Select translation language for daily word"
                            className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 transition focus:border-blue-500 focus:outline-none cursor-pointer"
                        >
                            {TRANSLATION_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.label}
                                </option>
                            ))}
                        </select>
                        <Languages className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>

                    <button
                        type="button"
                        onClick={handleSearchClick}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <Search className="h-3.5 w-3.5" aria-hidden="true" />
                        Search in Coach
                    </button>
                </div>
            </div>

            {/* Meaning Section */}
            <div className="mt-5 space-y-1.5 rounded-2xl border border-amber-100 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        Meaning
                    </span>
                    <button
                        type="button"
                        onClick={() => handleTranslate("meaning")}
                        disabled={translatingMeaning}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                        {translatingMeaning ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                            <Globe className="h-3 w-3" aria-hidden="true" />
                        )}
                        Translate Meaning
                    </button>
                </div>
                <p className="text-base leading-relaxed text-slate-800">{dailyWord.meaning}</p>
                {translatedMeaning && (
                    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-800 font-medium">
                        <span className="text-xs font-bold text-blue-700 block mb-0.5">{selectedLangOption.flag} {selectedLangOption.label} Translation</span>
                        {translatedMeaning}
                    </div>
                )}
            </div>

            {/* Example Sentence Section */}
            <div className="mt-4 space-y-1.5 rounded-2xl border border-amber-100 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700">
                        <Quote className="h-4 w-4" aria-hidden="true" />
                        Example Sentence
                    </span>
                    <button
                        type="button"
                        onClick={() => handleTranslate("example")}
                        disabled={translatingExample}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                        {translatingExample ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                            <Globe className="h-3 w-3" aria-hidden="true" />
                        )}
                        Translate Example
                    </button>
                </div>
                <p className="text-base italic leading-relaxed text-slate-700">&ldquo;{dailyWord.example}&rdquo;</p>
                {translatedExample && (
                    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-800 font-medium not-italic">
                        <span className="text-xs font-bold text-blue-700 block mb-0.5">{selectedLangOption.flag} {selectedLangOption.label} Translation</span>
                        {translatedExample}
                    </div>
                )}
            </div>

            {translationError && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{translationError}</span>
                </div>
            )}

            {/* Synonyms & Antonyms Pills Row */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {dailyWord.synonyms && dailyWord.synonyms.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            Synonyms
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {dailyWord.synonyms.map((syn, idx) => (
                                <span key={idx} className="rounded-xl border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                    {syn}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {dailyWord.antonyms && dailyWord.antonyms.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                            <Split className="h-3.5 w-3.5" aria-hidden="true" />
                            Antonyms
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {dailyWord.antonyms.map((ant, idx) => (
                                <span key={idx} className="rounded-xl border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                    {ant}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
