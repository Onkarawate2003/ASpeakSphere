/**
 * Type definitions for the AI Conversation module.
 *
 * Phase 2 — UI + local state only.
 * Phase 3 — Simulated AI conversation engine (typing, completion, prompts).
 * Phase 6 — Backend DTOs mirroring the FastAPI conversation schemas so the
 *           frontend can persist conversations and messages to PostgreSQL.
 */

/** The five practice modes that can launch a conversation session. */
export type PracticeType =
    | "speaking"
    | "listening"
    | "vocabulary"
    | "grammar"
    | "pronunciation";

/** Who authored a chat message. */
export type MessageRole = "ai" | "user";

/** A single chat message stored in local React state. */
export type ConversationMessage = {
    id: string;
    role: MessageRole;
    content: string;
    /** ISO timestamp string — used for the timestamp placeholder. */
    timestamp: string;
};

/** Lifecycle of a conversation session. */
export type ConversationStatus = "idle" | "active" | "ended";

/** Difficulty badge shown in the header. */
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

/** Shape of the ConversationContext value consumed via `useConversation()`. */
export type ConversationContextValue = {
    /** Currently selected practice type (from the URL search param). */
    practiceType: PracticeType | null;
    /** Human-readable label for the selected practice mode. */
    practiceLabel: string;
    /** Difficulty badge derived from the practice type. */
    difficulty: Difficulty;
    /**
     * Phase 9 — stable catalog id of the selected lesson (null for free-form
     * sessions). Phase 11 — surfaced so the follow-up actions can link to the
     * lesson's assessment quiz.
     */
    lessonId: string | null;
    /**
     * Phase 9 — title of the selected lesson (null for free-form sessions).
     * Surfaced in the header, summary and history so the learner can see
     * which lesson a conversation belongs to.
     */
    lessonTitle: string | null;
    /**
     * Phase 9 — ordered objectives for the selected lesson (null when no
     * lesson is selected). Kept in context so the summary can display them.
     */
    lessonObjectives: string[] | null;
    /** All chat messages (empty until the session starts). */
    messages: ConversationMessage[];
    /** Current lifecycle status. */
    status: ConversationStatus;
    /** Elapsed session time in seconds (timer placeholder). */
    elapsedSeconds: number;
    /**
     * Phase 10.5 — ISO timestamp the conversation started (from the backend
     * row). Null before a session is persisted / hydrated. Surfaced so the
     * stats and summary can show the real session date/time dynamically.
     */
    startedAt: string | null;
    /**
     * Phase 10.5 — ISO timestamp the conversation ended (from the backend
     * row). Null while the session is active or idle.
     */
    endedAt: string | null;
    /** Whether Emma is currently "typing" a reply (typing indicator shown). */
    isTyping: boolean;
    /** Whether the practice session has been completed (max messages reached). */
    isCompleted: boolean;
    /** Whether an API request is in flight (disables send/restart/end). */
    isLoading: boolean;
    /** Backend conversation id once a session has been persisted (null pre-session). */
    conversationId: number | null;
    /** Start the session: insert the first AI message and begin the timer. */
    startSession: () => void;
    /**
     * Start the session AND immediately send the given prompt as the first
     * user message. Used by the suggested-prompt chips on the welcome screen.
     */
    startWithPrompt: (content: string) => void;
    /** Restart: clear all messages and return to the welcome state. */
    restartSession: () => void;
    /** End the session: stop the timer (navigation handled by the caller). */
    endSession: () => void;
    /**
     * Append a user message and trigger Emma's simulated reply.
     * Empty/whitespace messages are ignored. Sending is blocked while
     * Emma is typing or the session is completed.
     */
    sendMessage: (content: string) => void;
    /**
     * Load an existing conversation from the backend by id (Phase 8 —
     * Conversation History). Restores messages, status and duration so
     * the session can be continued or reviewed. Used by the history
     * detail page and the "Continue Conversation" flow.
     */
    loadConversation: (id: number) => Promise<void>;
};

/* ------------------------------------------------------------------ *
 * Phase 6 — Backend DTOs
 *
 * These mirror the Pydantic schemas in `backend/app/schemas/` so the
 * frontend can talk to the FastAPI conversation endpoints. Field names
 * and casing match the JSON the backend serializes (snake_case).
 * ------------------------------------------------------------------ */

/** Backend conversation lifecycle (no "idle" — that is frontend-only). */
export type BackendConversationStatus = "active" | "ended";

/** Backend message sender enum (mirrors `MessageSender`). */
export type BackendMessageSender = "ai" | "user";

/** Payload for `POST /api/conversations` (mirrors `ConversationCreate`). */
export type ConversationCreatePayload = {
    practice_type: PracticeType;
    /** Phase 9 — optional selected lesson id (stable catalog identifier). */
    lesson_id?: string | null;
    /** Phase 9 — optional selected lesson title (human-readable). */
    lesson_title?: string | null;
    /** Phase 9 — optional ordered lesson objectives Emma will teach. */
    lesson_objectives?: string[] | null;
};

/** Payload for `PATCH /api/conversations/{id}` (mirrors `ConversationUpdate`). */
export type ConversationUpdatePayload = {
    status?: BackendConversationStatus;
    ended_at?: string;
    duration_seconds?: number;
};

/** Payload for `POST /api/conversations/{id}/messages` (mirrors `MessageCreate`). */
export type MessageCreatePayload = {
    message: string;
};

/** Response from `POST /api/conversations` and `PATCH /api/conversations/{id}`. */
export type ConversationResponseDTO = {
    id: number;
    user_id: number;
    practice_type: PracticeType;
    status: BackendConversationStatus;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    created_at: string;
    /** Phase 9 — selected lesson id (null for free-form / pre-Phase-9 rows). */
    lesson_id: string | null;
    /** Phase 9 — selected lesson title (null for free-form / pre-Phase-9 rows). */
    lesson_title: string | null;
    /** Phase 9 — ordered lesson objectives (null when no lesson was selected). */
    lesson_objectives: string[] | null;
    /**
     * Phase 10.5 — XP awarded for completing this conversation (0 when the
     * conversation is still active or predates the XP system). Read from the
     * xp_awards ledger by the backend so the history surfaces can show
     * "XP earned" per session.
     */
    xp_earned: number;
};

/** Response from `GET /api/conversations/{id}` — includes the messages. */
export type ConversationDetailDTO = ConversationResponseDTO & {
    messages: MessageResponseDTO[];
};

/** Response from `GET /api/conversations` — list item with a message count. */
export type ConversationListItemDTO = {
    id: number;
    user_id: number;
    practice_type: PracticeType;
    status: BackendConversationStatus;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    message_count: number;
    /** Phase 9 — selected lesson id (null for free-form / pre-Phase-9 rows). */
    lesson_id: string | null;
    /** Phase 9 — selected lesson title (null for free-form / pre-Phase-9 rows). */
    lesson_title: string | null;
    /** Phase 9 — ordered lesson objectives (null when no lesson was selected). */
    lesson_objectives: string[] | null;
    /**
     * Phase 10.5 — XP awarded for completing this conversation (0 when the
     * conversation is still active or predates the XP system).
     */
    xp_earned: number;
};

/** Response from `POST /api/conversations/{id}/messages` and `GET .../messages`. */
export type MessageResponseDTO = {
    id: number;
    conversation_id: number;
    sender: BackendMessageSender;
    message: string;
    timestamp: string;
};
