import { authedFetch } from "@/features/auth/api";

export interface VocabularySearchResponse {
    is_valid_word?: boolean;
    error_message?: string;
    word: string;
    pronunciation: string;
    part_of_speech: string;
    meaning: string;
    example: string;
    // Forward-compatible optional fields for future phases
    synonyms?: string[];
    antonyms?: string[];
    translations?: Record<string, string>;
    notes?: Record<string, string>;
}

export function searchVocabulary(word: string): Promise<VocabularySearchResponse> {
    return authedFetch<VocabularySearchResponse>("/vocabulary/search", {
        method: "POST",
        body: JSON.stringify({ word }),
    });
}

// ---------------------------------------------------------------------------
// Phase 1.5A — Save Word to Personal Vocabulary
// ---------------------------------------------------------------------------

export interface SavedWordPayload {
    word: string;
    pronunciation: string;
    part_of_speech: string;
    meaning: string;
    example: string;
    synonyms: string[];
    antonyms: string[];
}

export interface SavedWordResponse extends SavedWordPayload {
    id: number;
    user_id: number;
    created_at: string;
}

export interface SavedWordStatusResponse {
    word: string;
    is_saved: boolean;
}

/** Save a vocabulary word to the authenticated user's personal collection. */
export function saveWord(payload: SavedWordPayload): Promise<SavedWordResponse> {
    return authedFetch<SavedWordResponse>("/vocabulary/save", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/** Remove a saved vocabulary word from the authenticated user's collection. */
export async function unsaveWord(word: string): Promise<void> {
    await authedFetch<void>(`/vocabulary/save/${encodeURIComponent(word.trim().toLowerCase())}`, {
        method: "DELETE",
    });
}

/** Check whether the authenticated user has saved the given word. */
export function getSaveStatus(word: string): Promise<SavedWordStatusResponse> {
    return authedFetch<SavedWordStatusResponse>(
        `/vocabulary/save/status/${encodeURIComponent(word.trim().toLowerCase())}`,
        { method: "GET" },
    );
}

/** Return all vocabulary words saved by the authenticated user, newest first. */
export function listSavedWords(): Promise<SavedWordResponse[]> {
    return authedFetch<SavedWordResponse[]>("/vocabulary/saved", {
        method: "GET",
    });
}

// ---------------------------------------------------------------------------
// Phase 1.6 — Personalized Daily Word (Interest-Based)
// ---------------------------------------------------------------------------

export interface PersonalizedDailyWordResponse {
    id: number;
    user_id: number;
    date: string;
    topic: string;
    learning_goal: string;
    level: string;
    focus_area: string;
    word: string;
    pronunciation: string;
    part_of_speech: string;
    meaning: string;
    example: string;
    synonyms: string[];
    antonyms: string[];
    created_at: string;
}

/** Fetch today's personalized daily word recommendation. Cached in DB per user/date. */
export function getDailyWord(): Promise<PersonalizedDailyWordResponse> {
    return authedFetch<PersonalizedDailyWordResponse>("/vocabulary/daily", {
        method: "GET",
    });
}

// ---------------------------------------------------------------------------
// Phase 1.7 & 1.8 — Vocabulary Quiz & Progress APIs
// ---------------------------------------------------------------------------

export interface QuizQuestionOption {
    id: string;
    text: string;
}

export interface QuizQuestion {
    id: string;
    word: string;
    question_type: "meaning_to_word" | "word_to_meaning" | "synonym_match" | "antonym_match";
    question_text: string;
    options: QuizQuestionOption[];
    correct_option_id: string;
    explanation: string;
}

export interface QuizGenerateResponse {
    quiz_id: string;
    total_questions: number;
    questions: QuizQuestion[];
    source_summary: string;
}

export interface QuizSubmissionItem {
    word: string;
    question_type: string;
    selected_option_id: string;
    correct_option_id: string;
    is_correct: boolean;
}

export interface QuizSubmissionResponse {
    score: number;
    total_questions: number;
    accuracy_percentage: number;
    xp_earned: number;
    mastered_count: number;
    results: Array<{
        word: string;
        question_type: string;
        is_correct: boolean;
        new_mastery_status: "mastered" | "learning" | "needs_revision";
    }>;
}

export interface VocabProgressResponse {
    total_saved_words: number;
    mastered_words_count: number;
    learning_words_count: number;
    needs_revision_count: number;
    total_quizzes_taken: number;
    overall_accuracy_percentage: number;
    strongest_words: string[];
    weakest_words: string[];
    recent_activity: Array<{
        word: string;
        status: "mastered" | "learning" | "needs_revision";
        accuracy: number;
        last_tested: string | null;
    }>;
}

export function generateQuiz(count: number = 5): Promise<QuizGenerateResponse> {
    return authedFetch<QuizGenerateResponse>(`/vocabulary/quiz/generate?count=${count}`, {
        method: "GET",
    });
}

export function submitQuiz(questions: QuizSubmissionItem[]): Promise<QuizSubmissionResponse> {
    return authedFetch<QuizSubmissionResponse>("/vocabulary/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ questions }),
    });
}

export function getVocabProgress(): Promise<VocabProgressResponse> {
    return authedFetch<VocabProgressResponse>("/vocabulary/progress", {
        method: "GET",
    });
}

