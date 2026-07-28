"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    AlertCircle,
    BookOpen,
    Copy,
    Loader2,
    RefreshCw,
    Search,
    Sparkles,
    Split,
    Star,
    Tag,
    Trash2,
    Volume2,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard";
import {
    listSavedWords,
    unsaveWord,
    type SavedWordResponse,
} from "@/features/vocabulary/api";

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------
function CardSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="h-7 w-32 rounded-xl bg-slate-100" />
                <div className="h-9 w-24 rounded-xl bg-slate-100" />
            </div>
            <div className="h-4 w-3/4 rounded-lg bg-slate-100" />
            <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
            <div className="h-16 w-full rounded-xl bg-slate-100" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Individual saved-word card
// ---------------------------------------------------------------------------
interface SavedWordCardProps {
    entry: SavedWordResponse;
    onRemove: (word: string) => void;
    removing: boolean;
}

function SavedWordCard({ entry, onRemove, removing }: SavedWordCardProps) {
    const hasSynonyms = entry.synonyms.length > 0;
    const hasAntonyms = entry.antonyms.length > 0;

    const savedDate = new Date(entry.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md space-y-5">
            {/* Card header: word + remove button */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400" fill="currentColor" aria-hidden="true" />
                        <h2 className="text-2xl font-bold text-slate-900 capitalize">{entry.word}</h2>
                    </div>
                    <p className="font-mono text-sm text-indigo-600 tracking-wide">{entry.pronunciation}</p>
                </div>

                <button
                    type="button"
                    onClick={() => onRemove(entry.word)}
                    disabled={removing}
                    aria-label={`Remove "${entry.word}" from saved words`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/30 disabled:cursor-wait disabled:opacity-60"
                >
                    {removing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Remove
                </button>
            </div>

            {/* Part of speech */}
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-slate-600 capitalize">{entry.part_of_speech}</span>
            </div>

            {/* Meaning */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-amber-600">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meaning</span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{entry.meaning}</p>
            </div>

            {/* Example Sentence */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-purple-500" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Example</span>
                </div>
                <p className="text-sm italic leading-6 text-slate-600">&ldquo;{entry.example}&rdquo;</p>
            </div>

            {/* Synonyms */}
            {hasSynonyms && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-sky-500" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Synonyms</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {entry.synonyms.map((syn, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center rounded-xl border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
                            >
                                {syn}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Antonyms */}
            {hasAntonyms && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Split className="h-4 w-4 text-rose-400" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Antonyms</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {entry.antonyms.map((ant, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center rounded-xl border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600"
                            >
                                {ant}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved date */}
            <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">Saved on {savedDate}</p>
        </article>
    );
}

// ---------------------------------------------------------------------------
// My Vocabulary page
// ---------------------------------------------------------------------------
export default function MyVocabularyPage() {
    const [words, setWords] = useState<SavedWordResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [removingWords, setRemovingWords] = useState<Set<string>>(new Set());

    const fetchWords = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listSavedWords();
            setWords(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load saved words. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWords();
    }, []);

    const handleRemove = async (word: string) => {
        // Optimistic update
        setRemovingWords((prev) => new Set(prev).add(word));
        const previousWords = words;
        setWords((prev) => prev.filter((w) => w.word !== word));

        try {
            await unsaveWord(word);
        } catch {
            // Revert on failure
            setWords(previousWords);
        } finally {
            setRemovingWords((prev) => {
                const next = new Set(prev);
                next.delete(word);
                return next;
            });
        }
    };

    // Local search: filter by word or meaning
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return words;
        return words.filter(
            (w) =>
                w.word.toLowerCase().includes(q) ||
                w.meaning.toLowerCase().includes(q),
        );
    }, [words, query]);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" aria-hidden="true" />
                    <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" aria-hidden="true" />

                    <div className="relative space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                            <Star className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                            My Vocabulary
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">My Vocabulary</h1>
                            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                                Review and manage the words you&apos;ve saved.
                            </p>
                        </div>
                        {!loading && !error && words.length > 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                                <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                                {words.length} {words.length === 1 ? "word" : "words"} saved
                            </div>
                        )}
                    </div>
                </section>

                {/* Search bar — visible only when there are words */}
                {!loading && !error && words.length > 0 && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by word or meaning..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-12 pr-4 text-base text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                aria-label="Search saved words"
                            />
                        </div>
                        {query.trim() && (
                            <p className="mt-2 text-xs text-slate-400 pl-1">
                                {filtered.length} {filtered.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}&rdquo;
                            </p>
                        )}
                    </section>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                            <AlertCircle className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">Something went wrong</h3>
                        <p className="mt-2 text-sm text-slate-500">{error}</p>
                        <button
                            type="button"
                            onClick={fetchWords}
                            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try Again
                        </button>
                    </section>
                )}

                {/* Empty State — no saved words at all */}
                {!loading && !error && words.length === 0 && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-400">
                            <Star className="h-8 w-8" aria-hidden="true" />
                        </div>
                        <h3 className="mt-5 text-xl font-bold text-slate-900">No saved words yet</h3>
                        <p className="mt-2 text-base text-slate-500">
                            You haven&apos;t saved any vocabulary yet.
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            Search for a word and tap the ⭐ to save it here.
                        </p>
                        <Link
                            href="/dashboard/vocabulary"
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                        >
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                            Go to Vocabulary Coach
                        </Link>
                    </section>
                )}

                {/* Empty search result (words exist but query matches nothing) */}
                {!loading && !error && words.length > 0 && filtered.length === 0 && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Search className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">No results found</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            No saved words match &ldquo;{query.trim()}&rdquo;. Try a different search term.
                        </p>
                    </section>
                )}

                {/* Word Cards Grid */}
                {!loading && !error && filtered.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((entry) => (
                            <SavedWordCard
                                key={entry.word}
                                entry={entry}
                                onRemove={handleRemove}
                                removing={removingWords.has(entry.word)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
