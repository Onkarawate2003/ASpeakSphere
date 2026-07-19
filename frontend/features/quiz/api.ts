// API client for the Lesson Assessment (Quiz) endpoints.
//
// Phase 11 — Assessment (Quiz) Module.
//
// All functions reuse the authenticated fetch helper from the auth module
// (`authedFetch`) so bearer-token injection, 401 handling and error parsing
// stay in one place. The quiz router is mounted under `/api/v1/quizzes`
// (the default base URL), so no relative-path trickery is needed (unlike the
// conversation router which lives under `/api`).

import { authedFetch } from "@/features/auth/api";
import type {
    QuizAttemptSummaryDTO,
    QuizDetailDTO,
    QuizResultResponseDTO,
    QuizStatsResponseDTO,
    QuizSubmitPayload,
} from "./types";

/**
 * Fetch the active quiz for a lesson (correct answers hidden).
 *
 * `GET /api/v1/quizzes/lesson/{lessonId}` → 200 `QuizDetailDTO`.
 * Returns 404 if no quiz exists for the lesson.
 */
export function getQuizForLesson(
    lessonId: string,
): Promise<QuizDetailDTO> {
    return authedFetch<QuizDetailDTO>(`/quizzes/lesson/${lessonId}`, {
        method: "GET",
    });
}

/**
 * Submit a quiz attempt for grading.
 *
 * `POST /api/v1/quizzes/{quizId}/submit` → 200 `QuizResultResponseDTO`.
 * The backend grades the answers, records the attempt, awards XP
 * (idempotently — exactly once per quiz), and returns the full result with a
 * per-question review.
 */
export function submitQuiz(
    quizId: number,
    payload: QuizSubmitPayload,
): Promise<QuizResultResponseDTO> {
    return authedFetch<QuizResultResponseDTO>(`/quizzes/${quizId}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Fetch the learner's most recent attempt for a quiz.
 *
 * `GET /api/v1/quizzes/{quizId}/latest` → 200 `QuizAttemptSummaryDTO`.
 * Returns 404 if the learner has never attempted this quiz.
 */
export function getLatestQuizAttempt(
    quizId: number,
): Promise<QuizAttemptSummaryDTO> {
    return authedFetch<QuizAttemptSummaryDTO>(`/quizzes/${quizId}/latest`, {
        method: "GET",
    });
}

/**
 * Fetch the learner's quiz attempt history (newest first).
 *
 * `GET /api/v1/quizzes/history` → 200 `QuizAttemptSummaryDTO[]`.
 */
export function getQuizHistory(): Promise<QuizAttemptSummaryDTO[]> {
    return authedFetch<QuizAttemptSummaryDTO[]>(`/quizzes/history`, {
        method: "GET",
    });
}

/**
 * Fetch aggregate quiz statistics for the authenticated user.
 *
 * `GET /api/v1/quizzes/stats` → 200 `QuizStatsResponseDTO`.
 * Powers the dashboard and statistics page quiz analytics.
 */
export function getQuizStats(): Promise<QuizStatsResponseDTO> {
    return authedFetch<QuizStatsResponseDTO>(`/quizzes/stats`, {
        method: "GET",
    });
}
