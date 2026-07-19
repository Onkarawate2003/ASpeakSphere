"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { toast } from "sonner";
import type {
    ConversationContextValue,
    ConversationDetailDTO,
    ConversationMessage,
    ConversationStatus,
    Difficulty,
    MessageResponseDTO,
    PracticeType,
} from "./types";
import {
    buildFirstAIMessage,
    MAX_USER_MESSAGES,
    PRACTICE_DIFFICULTY,
    PRACTICE_LABELS,
    TYPING_DELAY_MS,
} from "./constants";
import { formatTimestamp, generateId } from "./utils";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/features/auth/api";
import { showErrorAlert } from "@/lib/sweetAlert";
import { useProgress } from "@/features/progress/ProgressContext";
import {
    completeConversation as completeConversationApi,
    getConversation as getConversationApi,
    getConversationMessages as getConversationMessagesApi,
    sendMessage as sendMessageApi,
    startConversation as startConversationApi,
} from "./api";

const ConversationContext = createContext<ConversationContextValue | null>(null);

type ConversationProviderProps = {
    /** Practice type resolved from the URL search param (null if missing/invalid). */
    practiceType: PracticeType | null;
    /**
     * Phase 9 — selected lesson id (from the lesson catalog). Optional so
     * free-form sessions (no lesson) keep working unchanged.
     */
    lessonId?: string | null;
    /**
     * Phase 9 — selected lesson title. Passed to the backend so Emma can
     * teach that specific lesson, and surfaced in the header/summary/history.
     */
    lessonTitle?: string | null;
    /**
     * Phase 9 — ordered lesson objectives Emma guides the learner through.
     */
    lessonObjectives?: string[] | null;
    /**
     * Phase 10.5 — a fully-loaded conversation detail (messages, status,
     * duration, lesson) used to hydrate the context on mount WITHOUT an
     * extra API call. The history detail page already fetched the
     * conversation via `GET /api/conversations/{id}`, so passing it here
     * lets the reused summary/stats/timeline components read real data
     * instead of the empty initial state. When provided, the sessionStorage
     * auto-load is skipped (the detail is already in hand).
     */
    initialDetail?: ConversationDetailDTO | null;
    children: React.ReactNode;
};

/* ------------------------------------------------------------------ *
 * SessionStorage persistence (survives page refresh within the tab).
 * Used by Task 5 to restore an in-progress conversation after refresh.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = "speakSphere:activeConversation";

type StoredConversation = { id: number; practiceType: PracticeType };

function readStoredConversation(): StoredConversation | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as StoredConversation;
    } catch {
        return null;
    }
}

function writeStoredConversation(id: number, practiceType: PracticeType): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ id, practiceType }),
        );
    } catch {
        // Ignore (private mode, quota, etc.)
    }
}

function clearStoredConversation(): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
}

/**
 * Write a conversation id + practice type to sessionStorage so the
 * ConversationProvider auto-loads it on mount (Phase 8 — Conversation
 * History "Continue Conversation" flow).
 *
 * Reuses the internal `writeStoredConversation` helper so the storage
 * format stays in one place. The history detail page calls this before
 * mounting the provider, and the "Continue Conversation" button calls it
 * before navigating to `/dashboard/conversation?practice=<type>&id=<id>`.
 */
export function prepareContinueConversation(
    id: number,
    practiceType: PracticeType,
): void {
    writeStoredConversation(id, practiceType);
}

/**
 * Fallback AI placeholder text used when the re-fetch of messages fails.
 * Mirrors the backend's `_AI_PLACEHOLDER_REPLY` in
 * `backend/app/api/v1/conversations.py`.
 */
const AI_PLACEHOLDER_FALLBACK =
    "[AI reply placeholder — conversation storage is ready, AI integration is not yet implemented.]";

/**
 * Map a backend `MessageResponseDTO` to the frontend `ConversationMessage`
 * shape (id → string, sender → role, message → content).
 */
function mapBackendMessage(m: MessageResponseDTO): ConversationMessage {
    return {
        id: String(m.id),
        role: m.sender,
        content: m.message,
        timestamp: m.timestamp,
    };
}

/**
 * Conversation provider — the single source of truth for the conversation
 * session (Task 11).
 *
 * Phase 6 flow:
 *  1. `startSession()` calls `POST /api/conversations`, stores the returned
 *     `conversationId`, inserts Emma's greeting, and starts the timer.
 *  2. `sendMessage(content)` optimistically displays the user message, calls
 *     `POST /api/conversations/{id}/messages`, preserves the typing
 *     animation, then re-fetches messages to display the backend's AI
 *     placeholder reply.
 *  3. After `MAX_USER_MESSAGES` user messages, the session auto-completes
 *     and `PATCH /api/conversations/{id}` is called with the final duration.
 *  4. `endSession()` calls `PATCH /api/conversations/{id}` to persist the
 *     ended status and duration before the caller navigates away.
 *  5. On mount, if a conversation id is found in `sessionStorage` (survives
 *     refresh), `GET /api/conversations/{id}` restores the messages, status
 *     and duration (Task 5).
 *
 * Guards use refs (not state) so rapid double-sends within the same render
 * tick are still blocked reliably. `isLoading` disables the send, restart
 * and end controls during API requests (Task 9).
 */
export function ConversationProvider({
    practiceType,
    lessonId,
    lessonTitle,
    lessonObjectives,
    initialDetail,
    children,
}: ConversationProviderProps) {
    const { user } = useAuth();
    const { refreshProgress } = useProgress();
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [status, setStatus] = useState<ConversationStatus>("idle");
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [conversationId, setConversationId] = useState<number | null>(null);
    // Phase 10.5 — backend timestamps so stats/summary can show the real
    // session date and ended time dynamically (never hardcoded).
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const [endedAt, setEndedAt] = useState<string | null>(null);

    // Phase 9 — active lesson state. Seeded from the provider props (selected
    // on the Lesson Selection page) and overwritten when an existing
    // conversation is loaded from the backend (so the header/summary reflect
    // the lesson that conversation actually belongs to).
    const [activeLessonTitle, setActiveLessonTitle] = useState<string | null>(
        lessonTitle ?? null,
    );
    const [activeLessonObjectives, setActiveLessonObjectives] = useState<
        string[] | null
    >(lessonObjectives ?? null);
    // Phase 11 — active lesson id (for linking to the assessment quiz).
    const [activeLessonId, setActiveLessonId] = useState<string | null>(
        lessonId ?? null,
    );

    // Refs for timers, rotation, and synchronous guards.
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userMessageCountRef = useRef<number>(0);
    const isTypingRef = useRef<boolean>(false);
    const isCompletedRef = useRef<boolean>(false);
    const isLoadingRef = useRef<boolean>(false);
    const conversationIdRef = useRef<number | null>(null);
    const elapsedSecondsRef = useRef<number>(0);
    const greetingMessageRef = useRef<ConversationMessage | null>(null);

    // Derive label + difficulty from the selected practice type.
    const practiceLabel = practiceType ? PRACTICE_LABELS[practiceType] : "Practice";
    const difficulty: Difficulty = practiceType
        ? PRACTICE_DIFFICULTY[practiceType]
        : "Intermediate";

    // Timer effect: tick every second while the session is active.
    useEffect(() => {
        if (status !== "active") {
            return;
        }
        intervalRef.current = setInterval(() => {
            setElapsedSeconds((prev) => {
                const next = prev + 1;
                elapsedSecondsRef.current = next;
                return next;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [status]);

    // Clean up all timers on unmount.
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, []);

    // Task 5 — Restore an in-progress conversation on mount (after refresh).
    // Phase 10.5 — when `initialDetail` is supplied (history review page) the
    // context is hydrated synchronously from the already-fetched detail,
    // skipping both the extra API call and the sessionStorage restore.
    useEffect(() => {
        if (!practiceType) return;

        if (initialDetail) {
            // Phase 10.5 — hydrate from the pre-fetched detail so the reused
            // summary/stats/transcript components read real data immediately.
            setActiveLessonTitle(initialDetail.lesson_title ?? lessonTitle ?? null);
            setActiveLessonObjectives(
                initialDetail.lesson_objectives ?? lessonObjectives ?? null,
            );
            setActiveLessonId(initialDetail.lesson_id ?? lessonId ?? null);

            const greeting: ConversationMessage = {
                id: generateId(),
                role: "ai",
                content: buildFirstAIMessage(practiceLabel, user?.first_name),
                timestamp: formatTimestamp(new Date()),
            };
            greetingMessageRef.current = greeting;

            const mapped = initialDetail.messages.map(mapBackendMessage);
            const userCount = initialDetail.messages.filter(
                (m) => m.sender === "user",
            ).length;

            setMessages([greeting, ...mapped]);
            userMessageCountRef.current = userCount;
            conversationIdRef.current = initialDetail.id;
            setConversationId(initialDetail.id);
            setStartedAt(initialDetail.started_at ?? null);
            setEndedAt(initialDetail.ended_at ?? null);

            if (initialDetail.status === "ended") {
                setStatus("ended");
                setIsCompleted(true);
                isCompletedRef.current = true;
                const dur = initialDetail.duration_seconds ?? 0;
                setElapsedSeconds(dur);
                elapsedSecondsRef.current = dur;
            } else {
                setStatus("active");
                const shouldComplete = userCount >= MAX_USER_MESSAGES;
                setIsCompleted(shouldComplete);
                isCompletedRef.current = shouldComplete;
                const elapsed = Math.floor(
                    (Date.now() - new Date(initialDetail.started_at).getTime()) / 1000,
                );
                setElapsedSeconds(elapsed);
                elapsedSecondsRef.current = elapsed;
            }
            return;
        }

        const stored = readStoredConversation();
        if (stored && stored.practiceType === practiceType) {
            loadConversation(stored.id);
        } else if (stored) {
            clearStoredConversation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [practiceType]);

    /**
     * Centralised API error handler (Task 8).
     * - 401 → "Session Expired" (the token is already cleared by authedFetch).
     * - Other ApiError → show the backend detail.
     * - Network/unknown → "Connection Error".
     */
    const handleApiError = useCallback((error: unknown) => {
        if (error instanceof ApiError) {
            if (error.status === 401) {
                showErrorAlert({
                    title: "Session Expired",
                    text: "Your session has expired. Please sign in again.",
                });
            } else {
                showErrorAlert({
                    title: "Something went wrong",
                    text: error.detail,
                });
            }
        } else {
            showErrorAlert({
                title: "Connection Error",
                text: "Could not reach the server. Please check your connection and try again.",
            });
        }
    }, []);

    /**
     * Persist the completed session to the backend (Task 6).
     * Best-effort: a toast is shown on failure but the UI completion is
     * not blocked.
     */
    const completeSession = useCallback(async () => {
        if (conversationIdRef.current === null) return;
        try {
            await completeConversationApi(
                conversationIdRef.current,
                elapsedSecondsRef.current,
            );
            // Phase 10 — refresh the user's XP/level/streak now that the
            // backend has awarded completion XP (idempotent on the server).
            void refreshProgress();
        } catch {
            toast.error("Could not save the session summary. Please try again later.");
        }
        clearStoredConversation();
    }, [refreshProgress]);

    /**
     * Shared "send message + typing + AI reply" pipeline used by both
     * `sendMessage` and `startWithPrompt` (Task 4).
     *
     * 1. Show the typing indicator.
     * 2. After `TYPING_DELAY_MS`: POST the user message, then re-fetch the
     *    conversation messages to display the backend's AI placeholder.
     *    If the re-fetch fails, fall back to a locally-constructed placeholder.
     * 3. If the user has reached the message limit, auto-complete the
     *    session and call `PATCH /api/conversations/{id}`.
     * 4. On POST failure, remove the optimistic message and show an error.
     */
    const persistAndReply = useCallback(
        (optimisticUserMessage: ConversationMessage, content: string) => {
            isTypingRef.current = true;
            setIsTyping(true);
            isLoadingRef.current = true;
            setIsLoading(true);

            typingTimeoutRef.current = setTimeout(async () => {
                try {
                    // Persist the user message (backend also stores the AI placeholder).
                    await sendMessageApi(conversationIdRef.current!, content);

                    // Re-fetch to display the backend's AI placeholder reply.
                    try {
                        const backendMessages =
                            await getConversationMessagesApi(conversationIdRef.current!);
                        const mapped = backendMessages.map(mapBackendMessage);
                        const greeting = greetingMessageRef.current;
                        setMessages(greeting ? [greeting, ...mapped] : mapped);
                    } catch {
                        // Re-fetch failed — fall back to a local AI placeholder.
                        const aiMessage: ConversationMessage = {
                            id: generateId(),
                            role: "ai",
                            content: AI_PLACEHOLDER_FALLBACK,
                            timestamp: formatTimestamp(new Date()),
                        };
                        setMessages((prev) => [...prev, aiMessage]);
                    }

                    isTypingRef.current = false;
                    setIsTyping(false);
                    isLoadingRef.current = false;
                    setIsLoading(false);

                    // Auto-complete if the message limit is reached.
                    if (userMessageCountRef.current >= MAX_USER_MESSAGES) {
                        isCompletedRef.current = true;
                        setIsCompleted(true);
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        completeSession();
                    }
                } catch (error) {
                    // POST failed — roll back the optimistic message.
                    isTypingRef.current = false;
                    setIsTyping(false);
                    isLoadingRef.current = false;
                    setIsLoading(false);
                    setMessages((prev) =>
                        prev.filter((m) => m.id !== optimisticUserMessage.id),
                    );
                    userMessageCountRef.current = Math.max(
                        0,
                        userMessageCountRef.current - 1,
                    );
                    handleApiError(error);
                }
            }, TYPING_DELAY_MS);
        },
        [completeSession, handleApiError],
    );

    /**
     * Start the session: create a backend conversation, insert Emma's
     * greeting, and begin the timer (Task 3).
     */
    const startSession = useCallback(async () => {
        if (!practiceType || isLoadingRef.current) return;

        isLoadingRef.current = true;
        setIsLoading(true);

        try {
            const response = await startConversationApi(practiceType, {
                id: lessonId ?? null,
                title: lessonTitle ?? null,
                objectives: lessonObjectives ?? null,
            });
            conversationIdRef.current = response.id;
            setConversationId(response.id);
            writeStoredConversation(response.id, practiceType);

            const greeting: ConversationMessage = {
                id: generateId(),
                role: "ai",
                content: buildFirstAIMessage(practiceLabel, user?.first_name),
                timestamp: formatTimestamp(new Date()),
            };
            greetingMessageRef.current = greeting;

            setMessages([greeting]);
            setElapsedSeconds(0);
            elapsedSecondsRef.current = 0;
            setStatus("active");
            setIsTyping(false);
            setIsCompleted(false);
            userMessageCountRef.current = 0;
            isTypingRef.current = false;
            isCompletedRef.current = false;
        } catch (error) {
            handleApiError(error);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, [
        practiceType,
        practiceLabel,
        lessonId,
        lessonTitle,
        lessonObjectives,
        user?.first_name,
        handleApiError,
    ]);

    /**
     * Start the session AND immediately send the given prompt as the first
     * user message. Used by the suggested-prompt chips on the welcome screen.
     */
    const startWithPrompt = useCallback(
        async (content: string) => {
            const trimmed = content.trim();
            if (!trimmed || !practiceType || isLoadingRef.current) return;

            isLoadingRef.current = true;
            setIsLoading(true);

            try {
                const response = await startConversationApi(practiceType, {
                    id: lessonId ?? null,
                    title: lessonTitle ?? null,
                    objectives: lessonObjectives ?? null,
                });
                conversationIdRef.current = response.id;
                setConversationId(response.id);
                writeStoredConversation(response.id, practiceType);

                const greeting: ConversationMessage = {
                    id: generateId(),
                    role: "ai",
                    content: buildFirstAIMessage(practiceLabel, user?.first_name),
                    timestamp: formatTimestamp(new Date()),
                };
                greetingMessageRef.current = greeting;

                const userMessage: ConversationMessage = {
                    id: generateId(),
                    role: "user",
                    content: trimmed,
                    timestamp: formatTimestamp(new Date()),
                };

                setMessages([greeting, userMessage]);
                setElapsedSeconds(0);
                elapsedSecondsRef.current = 0;
                setStatus("active");
                setIsTyping(false);
                setIsCompleted(false);
                userMessageCountRef.current = 1;
                isTypingRef.current = false;
                isCompletedRef.current = false;

                isLoadingRef.current = false;
                setIsLoading(false);

                persistAndReply(userMessage, trimmed);
            } catch (error) {
                isLoadingRef.current = false;
                setIsLoading(false);
                handleApiError(error);
            }
        },
        [
            practiceType,
            practiceLabel,
            lessonId,
            lessonTitle,
            lessonObjectives,
            user?.first_name,
            persistAndReply,
            handleApiError,
        ],
    );

    const restartSession = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        // Best-effort: mark the current conversation as ended in the backend.
        if (conversationIdRef.current !== null && !isCompletedRef.current) {
            completeConversationApi(
                conversationIdRef.current,
                elapsedSecondsRef.current,
            ).catch(() => {
                /* best-effort — don't block the restart */
            });
        }
        clearStoredConversation();

        setMessages([]);
        setElapsedSeconds(0);
        elapsedSecondsRef.current = 0;
        setStatus("idle");
        setIsTyping(false);
        setIsCompleted(false);
        setIsLoading(false);
        setConversationId(null);
        userMessageCountRef.current = 0;
        isTypingRef.current = false;
        isCompletedRef.current = false;
        isLoadingRef.current = false;
        conversationIdRef.current = null;
        greetingMessageRef.current = null;
        // Phase 9 — reset the active lesson back to the provider props so a
        // restarted session reflects the lesson the user originally selected.
        setActiveLessonTitle(lessonTitle ?? null);
        setActiveLessonObjectives(lessonObjectives ?? null);
        setActiveLessonId(lessonId ?? null);
    }, [lessonTitle, lessonObjectives, lessonId]);

    /**
     * End the session: stop the timer and persist the ended status +
     * duration to the backend (Task 6). Returns a promise so the caller
     * can await it before navigating away.
     */
    const endSession = useCallback(async () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        isTypingRef.current = false;
        setIsTyping(false);
        setStatus("ended");
        // Capture whether the session was already completed (the
        // auto-completion path via MAX_USER_MESSAGES) BEFORE marking it
        // completed below. The guard that persists the conversation and
        // awards XP relies on this snapshot so manual "End Session" still
        // triggers the backend call (isCompletedRef.current would otherwise
        // always be true at the guard, skipping XP awarding).
        const wasAlreadyCompleted = isCompletedRef.current;
        // Phase 11 — mark the session as completed so the completion
        // experience (ConversationComplete → FollowUpActions, including the
        // "Take Lesson Assessment" card) renders below the transcript. The
        // auto-completion path (MAX_USER_MESSAGES) already sets this; manual
        // "End Session" now does too so the learner sees their follow-up
        // actions instead of being navigated away immediately.
        isCompletedRef.current = true;
        setIsCompleted(true);

        if (conversationIdRef.current !== null && !wasAlreadyCompleted) {
            isLoadingRef.current = true;
            setIsLoading(true);
            try {
                await completeConversationApi(
                    conversationIdRef.current,
                    elapsedSecondsRef.current,
                );
                // Phase 10 — refresh XP/level/streak after the backend
                // awards completion XP (idempotent server-side).
                void refreshProgress();
            } catch {
                toast.error("Could not save the session. Please try again later.");
            } finally {
                isLoadingRef.current = false;
                setIsLoading(false);
            }
        }
        clearStoredConversation();
    }, [refreshProgress]);

    /**
     * Append a user message optimistically, then persist it to the backend
     * and trigger the typing animation + AI placeholder reply (Task 4).
     *
     * Empty/whitespace messages are ignored. Sending is blocked while Emma
     * is typing, the session is completed, or an API request is in flight
     * (guards use refs so rapid double-sends within one tick are prevented).
     */
    const sendMessage = useCallback(
        (content: string) => {
            const trimmed = content.trim();
            if (!trimmed) return;
            if (isTypingRef.current || isCompletedRef.current || isLoadingRef.current)
                return;
            if (conversationIdRef.current === null) return;

            const userMessage: ConversationMessage = {
                id: generateId(),
                role: "user",
                content: trimmed,
                timestamp: formatTimestamp(new Date()),
            };
            setMessages((prev) => [...prev, userMessage]);
            userMessageCountRef.current += 1;

            persistAndReply(userMessage, trimmed);
        },
        [persistAndReply],
    );

    /**
     * Load an existing conversation from the backend (Task 5).
     * Restores messages, status and duration. The greeting (frontend-only)
     * is reconstructed and prepended since the backend does not store it.
     */
    const loadConversation = useCallback(
        async (id: number) => {
            if (!practiceType) return;
            isLoadingRef.current = true;
            setIsLoading(true);
            try {
                const detail = await getConversationApi(id);

                // Guard: the stored conversation must match the current practice.
                if (detail.practice_type !== practiceType) {
                    clearStoredConversation();
                    return;
                }

                // Phase 9 — restore the lesson this conversation belongs to so
                // the header/summary reflect it (e.g. when continuing from
                // history). Falls back to the provider props when the backend
                // row has no lesson (free-form / pre-Phase-9 conversations).
                setActiveLessonTitle(detail.lesson_title ?? lessonTitle ?? null);
                setActiveLessonObjectives(
                    detail.lesson_objectives ?? lessonObjectives ?? null,
                );
                setActiveLessonId(detail.lesson_id ?? lessonId ?? null);

                const greeting: ConversationMessage = {
                    id: generateId(),
                    role: "ai",
                    content: buildFirstAIMessage(practiceLabel, user?.first_name),
                    timestamp: formatTimestamp(new Date()),
                };
                greetingMessageRef.current = greeting;

                const mapped = detail.messages.map(mapBackendMessage);
                const userCount = detail.messages.filter(
                    (m) => m.sender === "user",
                ).length;

                setMessages([greeting, ...mapped]);
                userMessageCountRef.current = userCount;
                conversationIdRef.current = id;
                setConversationId(id);
                setStartedAt(detail.started_at ?? null);
                setEndedAt(detail.ended_at ?? null);

                if (detail.status === "ended") {
                    setStatus("ended");
                    setIsCompleted(true);
                    isCompletedRef.current = true;
                    const dur = detail.duration_seconds ?? 0;
                    setElapsedSeconds(dur);
                    elapsedSecondsRef.current = dur;
                } else {
                    setStatus("active");
                    const shouldComplete = userCount >= MAX_USER_MESSAGES;
                    setIsCompleted(shouldComplete);
                    isCompletedRef.current = shouldComplete;
                    const elapsed = Math.floor(
                        (Date.now() - new Date(detail.started_at).getTime()) / 1000,
                    );
                    setElapsedSeconds(elapsed);
                    elapsedSecondsRef.current = elapsed;
                }
            } catch (error) {
                handleApiError(error);
                clearStoredConversation();
            } finally {
                isLoadingRef.current = false;
                setIsLoading(false);
            }
        },
        [
            practiceType,
            practiceLabel,
            lessonTitle,
            lessonObjectives,
            user?.first_name,
            handleApiError,
        ],
    );

    const value = useMemo<ConversationContextValue>(
        () => ({
            practiceType,
            practiceLabel,
            difficulty,
            lessonId: activeLessonId,
            lessonTitle: activeLessonTitle,
            lessonObjectives: activeLessonObjectives,
            messages,
            status,
            elapsedSeconds,
            startedAt,
            endedAt,
            isTyping,
            isCompleted,
            isLoading,
            conversationId,
            startSession,
            startWithPrompt,
            restartSession,
            endSession,
            sendMessage,
            loadConversation,
        }),
        [
            practiceType,
            practiceLabel,
            difficulty,
            activeLessonId,
            activeLessonTitle,
            activeLessonObjectives,
            messages,
            status,
            elapsedSeconds,
            startedAt,
            endedAt,
            isTyping,
            isCompleted,
            isLoading,
            conversationId,
            startSession,
            startWithPrompt,
            restartSession,
            endSession,
            sendMessage,
            loadConversation,
        ],
    );

    return (
        <ConversationContext.Provider value={value}>
            {children}
        </ConversationContext.Provider>
    );
}

export function useConversation() {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error(
            "useConversation must be used within a ConversationProvider.",
        );
    }
    return context;
}
