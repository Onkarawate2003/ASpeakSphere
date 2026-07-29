"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, Layers3 } from "lucide-react";
import { useTtsPlayback } from "@/features/conversation/useTtsPlayback";
import grammarCategoriesJson from "../data/grammar-topics.json";
import type {
    GrammarCategory,
    GrammarDifficulty,
    GrammarTopic,
} from "../types";

const grammarCategories = grammarCategoriesJson as GrammarCategory[];

const difficultyStyles: Record<GrammarDifficulty, string> = {
    Beginner: "bg-emerald-50 text-emerald-700",
    Intermediate: "bg-amber-50 text-amber-700",
    Advanced: "bg-rose-50 text-rose-700",
};

export default function LearnGrammar() {
    const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const filteredCategories = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        if (!query) return grammarCategories;

        return grammarCategories.flatMap((category) => {
            const categoryMatches = `${category.title} ${category.description}`
                .toLocaleLowerCase()
                .includes(query);
            const topics = categoryMatches
                ? category.topics
                : category.topics.filter((topic) =>
                    `${topic.title} ${topic.description} ${topic.difficulty}`
                        .toLocaleLowerCase()
                        .includes(query),
                );

            return topics.length > 0 ? [{ ...category, topics }] : [];
        });
    }, [searchQuery]);

    return (
        <section
            id="learn-grammar-panel"
            role="tabpanel"
            aria-labelledby="learn-grammar-tab"
            className="space-y-5"
        >
            {selectedTopic ? (
                <GrammarDetail
                    topic={selectedTopic}
                    onBack={() => setSelectedTopic(null)}
                />
            ) : (
                <>
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Structured learning</p>
                            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Grammar Curriculum</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Explore grammar categories and choose a topic to study.</p>
                        </div>
                        <label
                            htmlFor="grammar-topic-search"
                            className="mb-2 block text-sm font-bold text-slate-800"
                        >
                            Search grammar topics
                        </label>
                        <input
                            id="grammar-topic-search"
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search grammar topics..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>

                    {filteredCategories.length > 0 ? (
                        <div className="grid items-start gap-5 lg:grid-cols-2">
                            {filteredCategories.map((category) => {
                                const categoryDifficulties = Array.from(
                                    new Set(category.topics.map((topic) => topic.difficulty)),
                                );

                                return (
                                    <article
                                        key={category.id}
                                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                                    >
                                        <div className="p-5 sm:p-6">
                                            <div className="flex items-start gap-4">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700" aria-hidden="true">
                                                    <BookOpen size={22} strokeWidth={2} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Curriculum category</p>
                                                    <h2 className="mt-1 break-words text-xl font-extrabold tracking-tight text-slate-900">
                                                        {category.title}
                                                    </h2>
                                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                                        {category.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                                    <Layers3 size={14} aria-hidden="true" />
                                                    {category.topics.length} {category.topics.length === 1 ? "topic" : "topics"}
                                                </span>
                                                {categoryDifficulties.map((difficulty) => (
                                                    <span key={difficulty} className={`rounded-full px-3 py-1 text-xs font-bold ${difficultyStyles[difficulty]}`}>
                                                        {difficulty}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <details className="border-t border-slate-100" open={Boolean(searchQuery.trim()) || undefined}>
                                            <summary className="cursor-pointer select-none bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6">
                                                View curriculum topics ({category.topics.length})
                                            </summary>

                                            <div className="space-y-3 p-4 sm:p-5">
                                                {category.topics.map((topic, topicIndex) => (
                                                    <button
                                                        key={topic.id}
                                                        type="button"
                                                        onClick={() => setSelectedTopic(topic)}
                                                        className="block w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700" aria-hidden="true">
                                                                {topicIndex + 1}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                    <h3 className="break-words text-base font-bold text-slate-900">{topic.title}</h3>
                                                                    <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${difficultyStyles[topic.difficulty]}`}>
                                                                        {topic.difficulty}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1 text-sm leading-5 text-slate-500">{topic.description}</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </details>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                            <h2 className="text-lg font-extrabold text-slate-900">No grammar topics found</h2>
                            <p className="mt-2 text-sm text-slate-500">Try a different topic, category, or difficulty.</p>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function GrammarDetail({
    topic,
    onBack,
}: {
    topic: GrammarTopic;
    onBack: () => void;
}) {
    const {
        ttsEnabled,
        playbackState,
        speak,
        stop,
        ensureAudioElement,
    } = useTtsPlayback();
    const requestPendingRef = useRef(false);
    const isBusy = playbackState === "loading" || playbackState === "playing";

    const listenToExplanation = async () => {
        if (!ttsEnabled || isBusy || requestPendingRef.current) return;

        requestPendingRef.current = true;
        ensureAudioElement();
        try {
            await speak(`grammar-explanation-${topic.id}`, topic.definition);
        } finally {
            requestPendingRef.current = false;
        }
    };

    const returnToTopics = () => {
        stop();
        onBack();
    };

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <button
                type="button"
                onClick={returnToTopics}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                ← Back to topics
            </button>

            <header className="mt-6 border-b border-slate-100 pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                            Grammar Detail
                        </p>
                        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            {topic.title}
                        </h2>
                    </div>
                    <span
                        className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${difficultyStyles[topic.difficulty]}`}
                    >
                        {topic.difficulty}
                    </span>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                    {topic.description}
                </p>
            </header>

            <div className="mt-6">
                <button
                    type="button"
                    onClick={() => void listenToExplanation()}
                    disabled={!ttsEnabled || isBusy}
                    aria-busy={playbackState === "loading"}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    {playbackState === "loading"
                        ? "Generating audio…"
                        : playbackState === "playing"
                            ? "Playing explanation…"
                            : "Listen Explanation"}
                </button>
                {playbackState === "error" && (
                    <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
                        The explanation could not be played. Please try again.
                    </p>
                )}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <DetailSection title="Definition">
                    <p className="text-sm leading-6 text-slate-600">{topic.definition}</p>
                </DetailSection>

                <DetailSection title="Grammar Rules">
                    <ul className="space-y-3">
                        {topic.rules.map((rule, index) => (
                            <li key={rule} className="flex gap-3 text-sm leading-6 text-slate-600">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                                    {index + 1}
                                </span>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </DetailSection>

                <DetailSection title="Examples">
                    <div className="space-y-3">
                        {topic.examples.map((example) => (
                            <div key={example.sentence} className="rounded-2xl bg-emerald-50/70 p-4">
                                <p className="font-bold text-emerald-900">{example.sentence}</p>
                                <p className="mt-1 text-sm leading-5 text-emerald-800/80">
                                    {example.explanation}
                                </p>
                            </div>
                        ))}
                    </div>
                </DetailSection>

                <DetailSection title="Common Mistakes">
                    <div className="space-y-3">
                        {topic.commonMistakes.map((mistake) => (
                            <div key={mistake.incorrect} className="rounded-2xl bg-rose-50/70 p-4 text-sm">
                                <p className="text-rose-700">
                                    <span className="font-bold">Incorrect:</span> {mistake.incorrect}
                                </p>
                                <p className="mt-2 text-emerald-700">
                                    <span className="font-bold">Correct:</span> {mistake.correct}
                                </p>
                            </div>
                        ))}
                    </div>
                </DetailSection>
            </div>

            <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-amber-800">
                    Quick Tip
                </h3>
                <p className="mt-2 text-sm leading-6 text-amber-900">{topic.quickTip}</p>
            </section>
        </article>
    );
}

function DetailSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 p-5">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">{title}</h3>
            {children}
        </section>
    );
}
