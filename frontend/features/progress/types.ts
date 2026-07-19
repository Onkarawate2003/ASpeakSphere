/**
 * Type definitions for the Progress Tracking & XP System.
 *
 * Phase 10 — Progress Tracking & XP System.
 *
 * These mirror the Pydantic schemas in `backend/app/schemas/progress.py`
 * so the frontend can talk to the FastAPI progress endpoints. Field names
 * and casing match the JSON the backend serializes (snake_case).
 */

/** Response from `GET /api/v1/progress` and `PUT /api/v1/progress`. */
export type ProgressResponseDTO = {
    user_id: number;
    total_xp: number;
    current_level: number;
    completed_lessons: number;
    completed_conversations: number;
    current_streak: number;
    last_completed_date: string | null;
    total_practice_minutes: number;
    daily_practice_minutes: number;
    daily_conversations: number;
    daily_lessons: number;
    daily_quizzes: number;
    // Phase 11 — Quiz assessment counters (kept in sync by the quiz
    // completion flow so the dashboard renders in a single read).
    completed_quizzes: number;
    average_quiz_score: number;
    latest_quiz_score: number;
    // Derived level progress (computed server-side from total_xp).
    xp_into_level: number;
    xp_for_next_level: number;
    xp_needed_for_next: number;
    level_progress_percent: number;
    created_at: string;
    updated_at: string;
};

/**
 * Phase 11 Part 10 — XP source catalog.
 *
 * The `source` field on `AwardXpPayload` identifies the module granting XP.
 * Built-in sources are listed below; future modules add their own source
 * strings without modifying existing logic (the generic award endpoint and
 * the idempotent `xp_awards` ledger handle any source).
 */
export const XP_SOURCES = {
    LESSON: "lesson",
    CONVERSATION: "conversation",
    QUIZ: "quiz",
    // Future modules (reserved — not yet awarded by any flow):
    ACHIEVEMENT: "achievement",
    DAILY_CHALLENGE: "daily_challenge",
    VOCABULARY_GAME: "vocabulary_game",
    SPEAKING_ASSESSMENT: "speaking_assessment",
} as const;

/** Payload for `POST /api/v1/progress/award` (generic XP award for future modules). */
export type AwardXpPayload = {
    source: string;
    reference: string;
    amount: number;
    reason?: string | null;
};

/** Response from `POST /api/v1/progress/award`. */
export type AwardXpResponseDTO = {
    awarded: boolean;
    xp_awarded: number;
    progress: ProgressResponseDTO;
};
