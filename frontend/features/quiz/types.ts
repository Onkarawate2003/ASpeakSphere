/**
 * Type definitions for the Lesson Assessment (Quiz) system.
 *
 * Phase 11 — Assessment (Quiz) Module.
 *
 * These mirror the Pydantic schemas in `backend/app/schemas/quizzes.py`
 * so the frontend can talk to the FastAPI quiz endpoints. Field names and
 * casing match the JSON the backend serializes (snake_case).
 */

/** A quiz question as shown to the learner (correct answer hidden). */
export type QuestionPublicDTO = {
    id: number;
    question_text: string;
    options: string[];
    display_order: number;
    points: number;
    /** Phase 11 Part 10 — Question format (default "mcq"). Future types:
     * "true_false", "multiple_select", "short_answer". */
    question_type: string;
};

/** A quiz question as shown on the results review screen. */
export type QuestionReviewDTO = {
    id: number;
    question_text: string;
    options: string[];
    correct_answer_index: number;
    selected_answer_index: number | null;
    is_correct: boolean;
    explanation: string | null;
    display_order: number;
    /** Phase 11 Part 10 — Question format (default "mcq"). */
    question_type: string;
};

/** Full quiz with questions (correct answers hidden) for the learner. */
export type QuizDetailDTO = {
    id: number;
    lesson_id: string;
    title: string;
    description: string | null;
    difficulty: string;
    passing_score_percent: number;
    questions: QuestionPublicDTO[];
};

/** Payload for submitting a quiz attempt. */
export type QuizSubmitPayload = {
    /** Selected option indices (0-based), aligned to question display order. */
    answers: (number | null)[];
};

/** Full result of a quiz submission. */
export type QuizResultResponseDTO = {
    attempt_id: number;
    quiz_id: number;
    lesson_id: string;
    quiz_title: string;
    score: number;
    total_questions: number;
    percentage: number;
    xp_earned: number;
    /** True only when this attempt triggered a new XP grant (false on retakes). */
    xp_awarded: boolean;
    passed: boolean;
    review: QuestionReviewDTO[];
    completed_at: string;
};

/** A single past quiz attempt (used in history / stats). */
export type QuizAttemptSummaryDTO = {
    id: number;
    quiz_id: number;
    lesson_id: string;
    quiz_title: string;
    score: number;
    total_questions: number;
    percentage: number;
    xp_earned: number;
    completed_at: string;
};

/** Aggregate quiz statistics for the authenticated user. */
export type QuizStatsResponseDTO = {
    total_attempts: number;
    completed_quizzes: number;
    average_score: number;
    latest_score: number;
    highest_score: number;
    total_xp_from_quizzes: number;
};
