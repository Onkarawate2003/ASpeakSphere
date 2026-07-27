"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
    Pause,
    Play,
    RotateCcw,
    Languages,
    Loader2,
    Gauge,
    Sparkles,
    Volume2,
    VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { useConversation } from "@/features/conversation/ConversationContext";
import { useOptionalVoice } from "@/features/conversation/VoiceContext";
import { TUTOR_NAME } from "@/features/conversation/constants";
import { PRACTICE_WELCOME_MESSAGES } from "@/features/conversation/constants";
import type { PracticeType } from "@/features/conversation/types";
import {
    translateText,
    TRANSLATION_LANGUAGES,
    type TranslationLanguage,
} from "@/features/conversation/translationApi";
import { ApiError } from "@/features/auth/api";

/**
 * Phase M14 Enhancement — AIResponseCard.
 *
 * A large, premium response card that surfaces Emma's **latest** AI message as
 * the focal point of the redesigned Conversation screen — the place the
 * learner's eye lands right after the tutor portrait. It mirrors the
 * "current AI response" panel pattern used by premium AI-tutor apps, but with
 * ASpeakSphere's own visual language (slate-950 gradient, indigo accents,
 * generous spacing, rounded corners, elegant shadows).
 *
 * Responsibilities:
 *  - Show the newest AI message (or a friendly placeholder before the session
 *    starts / while Emma is composing her first reply).
 *  - Provide voice controls (Replay / Pause / Mute) that reuse the existing
 *    `useOptionalVoice()` TTS API. Phase 2 content cleanup: this card is now
 *    the SINGLE playback-control surface for the app — the duplicate
 *    controls previously in `VoiceConversationPanel`, `VoiceMessageCard`,
 *    and the per-message `ChatBubble` button were removed so there is one
 *    obvious place to control Emma's voice.
 *  - Speech Speed Control: the speed chip (Normal/Slow/Fast/Very Fast)
 *    cycles `useOptionalVoice().speechSpeed` via `cycleSpeechSpeed()`.
 *    State-only — it never fetches audio itself; the selected speed is
 *    sent with the next `speak()`/`replay()` call (see
 *    `useTtsPlayback.ts`), and persists for the current session the same
 *    way mute already does.
 *  - Translate (AI Conversation Translation feature): tap-to-translate the
 *    latest AI reply into any of the languages in `TRANSLATION_LANGUAGES`
 *    via the existing Groq LLM infrastructure (see `translationApi.ts`).
 *    Fully independent of the conversation pipeline and of TTS — it is
 *    presentation-only, local `useState` scoped to this component, keyed
 *    by message id (and then by language) so each AI reply keeps its own
 *    per-language translation cache and its own currently-shown language.
 *    Listen continues to speak the English original; translation never
 *    touches `ConversationContext`/`VoiceContext`, conversation history,
 *    or the stored message text.
 *
 * Speech synchronization:
 * The Replay/Pause button reflects the real `playbackState` of the active AI
 * message (driven by the HTMLAudioElement `playing`/`pause`/`ended` events in
 * `useTtsPlayback`). It is NOT timer-driven. When audio is playing → "Pause";
 * when paused → "Resume"; when ended → "Replay"; otherwise → "Listen".
 *
 * Performance:
 *  - `useMemo` over the messages array finds the latest AI message once per
 *    render (O(n) but n is tiny — capped at MAX_USER_MESSAGES exchanges).
 *  - `memo`-ized so it only re-renders when `messages`, `playbackState`, or
 *    `activeMessageId` change.
 *
 * Backward compatibility:
 * Uses `useOptionalVoice()` (returns null on read-only history pages), so the
 * voice controls gracefully hide when TTS is unavailable — exactly like
 * `ChatBubble` does today.
 *
 * Accessibility:
 *  - The card is a semantic `<article>` with an `aria-live="polite"` region so
 *    screen readers announce Emma's new replies.
 *  - Voice control buttons have descriptive `aria-label`s.
 *  - The Translate button's `aria-label`/`title` reflect its current state
 *    (translate / translating / hide) and it exposes `aria-pressed` for its
 *    toggle behaviour. The speed chip's `aria-label`/`title` announce the
 *    current speed and that tapping changes it.
 */

type AIResponseCardProps = {
    /** Optional extra classes for layout tweaks. */
    className?: string;
};

/**
 * Find the newest AI message in the transcript (or null if there isn't one).
 * Scans from the end so it is O(latest) in practice.
 */
function pickLatestAiMessage(
    messages: ReturnType<typeof useConversation>["messages"],
) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i].role === "ai") return messages[i];
    }
    return null;
}

function AIResponseCardInner({ className = "" }: AIResponseCardProps) {
    const { messages, isTyping, status, practiceType } = useConversation();
    const voice = useOptionalVoice();

    const ttsEnabled = voice?.ttsEnabled ?? false;
    const playbackState = voice?.playbackState ?? "idle";
    const activeMessageId = voice?.activeMessageId ?? null;
    const speak = voice?.speak ?? (async () => { });
    const pause = voice?.pause ?? (() => { });
    const resume = voice?.resume ?? (() => { });
    const replay = voice?.replay ?? (() => { });
    const isMuted = voice?.isMuted ?? false;
    const toggleMute = voice?.toggleMute ?? (() => { });
    const speechSpeedLabel = voice?.speechSpeedLabel ?? "Normal";
    const cycleSpeechSpeed = voice?.cycleSpeechSpeed ?? (() => { });

    const latestAi = useMemo(() => pickLatestAiMessage(messages), [messages]);

    // AI Conversation Translation feature — local, presentation-only state,
    // keyed by message id (and then by language) so each AI reply's
    // translations are completely independent of every other one. Nothing
    // here touches ConversationContext/VoiceContext, so it can never affect
    // the conversation pipeline, TTS, the timer, or history.
    //
    //  - `translations`: per-message, per-language cache of already-fetched
    //    translations. Once a (message id, language) pair has an entry, the
    //    LLM is never called again for it — picking that language again
    //    only toggles it back into view.
    //  - `shownLanguage`: which language (if any) is currently displayed
    //    for a given message id. `null`/absent means "showing English only".
    //  - `translatingKey`: `"<messageId>:<language>"` for the single
    //    translation request currently in flight (if any) — used both to
    //    show a loading state and to guard against a duplicate request for
    //    the same message+language.
    //  - `isLanguageMenuOpen`: whether the language selector is currently
    //    open for the latest AI reply.
    const [translations, setTranslations] = useState<
        Record<string, Partial<Record<TranslationLanguage, string>>>
    >({});
    const [shownLanguage, setShownLanguage] = useState<
        Record<string, TranslationLanguage | null>
    >({});
    const [translatingKey, setTranslatingKey] = useState<string | null>(null);
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

    const latestAiId = latestAi?.id ?? null;
    const currentLanguage = latestAiId !== null ? shownLanguage[latestAiId] ?? null : null;
    const currentLanguageOption = currentLanguage
        ? TRANSLATION_LANGUAGES.find((l) => l.code === currentLanguage)
        : undefined;
    const cachedTranslation =
        latestAiId !== null && currentLanguage
            ? translations[latestAiId]?.[currentLanguage]
            : undefined;
    const isTranslationShown = !!currentLanguage && !!cachedTranslation;
    const isTranslating =
        latestAiId !== null &&
        translatingKey !== null &&
        translatingKey.startsWith(`${latestAiId}:`);
    const translatingLanguage = isTranslating
        ? (translatingKey!.slice(latestAiId!.length + 1) as TranslationLanguage)
        : null;

    // Close the language selector whenever the latest AI reply changes, so
    // it never lingers open over a different message.
    useEffect(() => {
        setIsLanguageMenuOpen(false);
    }, [latestAiId]);

    /**
     * Fetch (or reuse the cache for) a translation of the latest AI reply
     * into `language`, then show it. Guarded against firing while a
     * request for this same message+language is already in flight. Never
     * touches `message.content` itself, never calls `sendMessage`/`speak`,
     * and never persists anything — purely local UI state.
     */
    const selectLanguage = async (language: TranslationLanguage) => {
        if (!latestAi) return;
        const id = latestAi.id;

        const existing = translations[id]?.[language];
        if (existing !== undefined) {
            setShownLanguage((prev) => ({ ...prev, [id]: language }));
            return;
        }

        const key = `${id}:${language}`;
        if (translatingKey === key) return;

        setTranslatingKey(key);
        try {
            const result = await translateText({
                text: latestAi.content,
                target_language: language,
            });
            setTranslations((prev) => ({
                ...prev,
                [id]: { ...prev[id], [language]: result.translated_text },
            }));
            setShownLanguage((prev) => ({ ...prev, [id]: language }));
        } catch (err) {
            toast.error("Could not translate this response", {
                description:
                    err instanceof ApiError
                        ? err.detail
                        : "Please check your connection and try again.",
            });
        } finally {
            setTranslatingKey((prev) => (prev === key ? null : prev));
        }
    };

    /**
     * Language menu item handler — "English (Original)" just hides any
     * shown translation (no request); every other option delegates to
     * `selectLanguage`. Always closes the menu (per the "close
     * automatically after language selection" requirement).
     */
    const handleSelectLanguage = (language: TranslationLanguage | "en") => {
        setIsLanguageMenuOpen(false);
        if (!latestAi) return;
        if (language === "en") {
            setShownLanguage((prev) => ({ ...prev, [latestAi.id]: null }));
            return;
        }
        void selectLanguage(language);
    };

    /**
     * Translate button click:
     *  - Menu open        → close it.
     *  - Translation shown → hide it (toggle back to English).
     *  - Otherwise         → open the language selector.
     */
    const handleTranslateClick = () => {
        if (!latestAi) return;
        if (isLanguageMenuOpen) {
            setIsLanguageMenuOpen(false);
            return;
        }
        if (isTranslationShown) {
            setShownLanguage((prev) => ({ ...prev, [latestAi.id]: null }));
            return;
        }
        setIsLanguageMenuOpen(true);
    };

    // Whether the latest AI message is the one currently loaded/playing.
    const isActiveMessage = !!latestAi && activeMessageId === latestAi.id;
    const isThisPlaying = isActiveMessage && playbackState === "playing";
    const isThisPaused = isActiveMessage && playbackState === "paused";
    const isThisEnded = isActiveMessage && playbackState === "ended";

    /**
     * Replay (or play) the latest AI message's audio via TTS. Mirrors the
     * exact logic in `ChatBubble.handleReplay` so there is one consistent
     * behaviour across the transcript and the focal response card:
     *  - paused → resume (no new request)
     *  - ended  → replay from start (reuses cached object URL)
     *  - otherwise → fetch fresh TTS audio via `speak()`
     */
    const handleVoiceControl = () => {
        if (!latestAi) return;
        if (isThisPlaying) {
            pause();
        } else if (isThisPaused) {
            resume();
        } else if (isThisEnded) {
            replay();
        } else {
            void speak(latestAi.id, latestAi.content);
        }
    };

    const voiceButtonLabel = isThisPlaying
        ? "Pause Emma's voice"
        : isActiveMessage
            ? isThisPaused
                ? "Resume Emma's voice"
                : "Replay Emma's voice"
            : "Listen to Emma's reply";

    const voiceButtonContent = isThisPlaying
        ? "Pause"
        : isActiveMessage
            ? isThisPaused
                ? "Resume"
                : "Replay"
            : "Listen";

    // Placeholder content shown before the session starts or while Emma
    // composes her very first reply.
    const placeholder =
        practiceType
            ? PRACTICE_WELCOME_MESSAGES[practiceType as PracticeType]
            : "I'm here to help you practice English. Let's get started whenever you're ready.";

    const showPlaceholder = !latestAi || (status === "idle" && !isTyping);

    return (
        <article
            aria-live="polite"
            aria-label="Emma's latest response"
            className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-2xl shadow-slate-900/30 sm:p-6 ${className}`}
        >
            {/* Decorative top accent */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
            />

            {/* Header row — tutor name + "latest response" tag */}
            <header className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-extrabold uppercase tracking-wide text-blue-200">
                        {TUTOR_NAME}
                    </span>
                </div>
                <span className="hidden rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-inset ring-white/10 sm:inline">
                    Latest response
                </span>
            </header>

            {/* Response body */}
            <div className="min-h-[4.5rem]">
                {showPlaceholder ? (
                    <p className="text-[0.95rem] leading-relaxed text-slate-300">
                        {placeholder}
                    </p>
                ) : isTyping && !isActiveMessage ? (
                    // Emma is composing a reply — show an elegant typing shimmer.
                    <div className="space-y-2" aria-label="Emma is typing">
                        <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                        <div className="h-3 w-11/12 animate-pulse rounded-full bg-white/10" />
                        <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
                    </div>
                ) : (
                    <p className="whitespace-pre-line break-words text-[1.05rem] leading-relaxed text-slate-100">
                        {latestAi?.content}
                    </p>
                )}
            </div>

            {/* Voice controls + future placeholders */}
            <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                {/* Primary voice control — Replay / Pause / Resume / Listen,
                    plus Mute. This is the single playback-control surface
                    for the app (Phase 2 content cleanup). */}
                {ttsEnabled && !showPlaceholder && (
                    <>
                        <button
                            type="button"
                            onClick={handleVoiceControl}
                            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95"
                            aria-label={voiceButtonLabel}
                        >
                            {isThisPlaying ? (
                                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : isActiveMessage && isThisEnded ? (
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {voiceButtonContent}
                        </button>
                        <button
                            type="button"
                            onClick={toggleMute}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 active:scale-95"
                            aria-label={isMuted ? "Unmute Emma's voice" : "Mute Emma's voice"}
                        >
                            {isMuted ? (
                                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {isMuted ? "Unmute" : "Mute"}
                        </button>
                    </>
                )}

                {/* Translate — AI Conversation Translation feature. Same
                    chip styling as before (no redesign); now opens a
                    language selector instead of translating straight to
                    Hindi. Inert while there's no real reply to translate
                    yet (showPlaceholder) or while a request is in flight. */}
                <button
                    type="button"
                    onClick={handleTranslateClick}
                    disabled={showPlaceholder || isTranslating}
                    aria-disabled={showPlaceholder || isTranslating}
                    aria-haspopup="menu"
                    aria-expanded={isLanguageMenuOpen}
                    aria-pressed={isTranslationShown}
                    aria-label={
                        isTranslating
                            ? "Translating…"
                            : isTranslationShown
                                ? `Hide ${currentLanguageOption?.label ?? ""} translation`
                                : isLanguageMenuOpen
                                    ? "Close language menu"
                                    : "Translate"
                    }
                    title={
                        isTranslating
                            ? "Translating…"
                            : isTranslationShown
                                ? `Hide ${currentLanguageOption?.label ?? ""} translation`
                                : "Translate"
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset transition ${showPlaceholder || isTranslating
                        ? "cursor-not-allowed bg-white/5 text-slate-400 ring-white/10"
                        : isTranslationShown || isLanguageMenuOpen
                            ? "bg-white/15 text-white ring-white/20 hover:bg-white/20"
                            : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10"
                        }`}
                >
                    {isTranslating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">Translate</span>
                </button>
                {/* Speech speed control — cycles Normal → Slow → Fast →
                    Very Fast → Normal. Same chip styling/position as
                    before (it replaces the old disabled placeholder); only
                    shown alongside the other voice controls since it has
                    nothing to control without TTS. Purely a state update —
                    it never fetches new audio by itself (see
                    `useTtsPlayback.cycleSpeechSpeed`); the new speed takes
                    effect on the next Listen/Replay. */}
                {ttsEnabled && !showPlaceholder && (
                    <button
                        type="button"
                        onClick={cycleSpeechSpeed}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 active:scale-95"
                        aria-label={`Playback speed: ${speechSpeedLabel}. Tap to change.`}
                        title={`Playback speed: ${speechSpeedLabel} — tap to change`}
                    >
                        <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">{speechSpeedLabel}</span>
                    </button>
                )}
            </footer>

            {/* Language selector — AI Conversation Translation feature.
                In-flow (not an absolutely-positioned overlay), so it can
                never be clipped by the card's `overflow-hidden` and never
                needs portal/click-outside plumbing; it simply grows the
                card's height while open, the same way the translation
                block below it already does. Closes automatically as soon
                as a language is picked. */}
            {isLanguageMenuOpen && !showPlaceholder && (
                <div
                    role="menu"
                    aria-label="Choose a translation language"
                    className="spk-bubble-enter mt-4 border-t border-white/10 pt-4"
                >
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Translate to
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleSelectLanguage("en")}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${currentLanguage === null
                                ? "bg-white/15 text-white ring-white/20"
                                : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10"
                                }`}
                        >
                            English (Original)
                        </button>
                        {TRANSLATION_LANGUAGES.map((lang) => {
                            const isActive = currentLanguage === lang.code;
                            const isThisTranslating =
                                isTranslating && translatingLanguage === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleSelectLanguage(lang.code)}
                                    disabled={isThisTranslating}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${isActive
                                        ? "bg-white/15 text-white ring-white/20"
                                        : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10"
                                        } ${isThisTranslating ? "cursor-wait opacity-70" : ""}`}
                                >
                                    {isThisTranslating ? (
                                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <span aria-hidden="true">{lang.flag}</span>
                                    )}
                                    {lang.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Translation display — AI Conversation Translation feature.
                Appended below the footer (not between the English text and
                its controls) so toggling it never shifts the position of
                the Listen/Mute/Translate buttons. Text-only: the Listen
                button above always speaks the English original. Reuses the
                existing spk-bubble-enter entrance animation for
                consistency with the rest of the app, rather than
                introducing a new one. */}
            {isTranslationShown && cachedTranslation && currentLanguageOption && (
                <div className="spk-bubble-enter mt-4 border-t border-white/10 pt-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
                        <span aria-hidden="true">{currentLanguageOption.flag}</span>
                        {currentLanguageOption.label} Translation
                    </p>
                    <p className="whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-slate-200">
                        {cachedTranslation}
                    </p>
                </div>
            )}
        </article>
    );
}

/**
 * Memoized export — the card only re-renders when `messages`, `playbackState`,
 * `activeMessageId`, `isTyping`, `status`, or `practiceType` change. Since the
 * voice API functions are stable (memoized in `VoiceContext`), this keeps
 * re-renders to the absolute minimum.
 */
const AIResponseCard = memo(AIResponseCardInner);

export default AIResponseCard;
