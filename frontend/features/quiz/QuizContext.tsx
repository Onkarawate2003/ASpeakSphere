"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { toast } from "sonner";

import { ApiError } from "@/features/auth/api";
import { getQuizForLesson, submitQuiz } from "./api";
import type {
    QuizDetailDTO,
    QuizResultResponseDTO,
} from "./types";

/**
 * Phase 11 — Assessment (Quiz) Module.
 *
 * The quiz state machine, mirroring the ConversationContext pattern but
 * simpler (no streaming, no timers). The lifecycle is:
 *
 *   loading → taking → submitting → results
 *                ↑___________________|  (retake resets to "taking")
 *
 * The provider is scoped to a single lesson's quiz. The page mounts it with
 * a `lessonId` and the context fetches the quiz on mount. The learner
 * navigates questions, selects answers, and submits. On submit the context
 * calls the backend (which grades + awards XP idempotently) and transitions
 * to the results phase, exposing the per-question review.
 */

export type QuizPhase = "loading" | "taking" | "submitting" | "results" | "error";

export type QuizContextValue = {
    /** The quiz being taken (null until loaded / if fetch failed). */
    quiz: QuizDetailDTO | null;
    /** The graded result (null until submitted). */
    result: QuizResultResponseDTO | null;
    /** Selected option index per question (aligned to question order). */
    answers: (number | null)[];
    /** 0-based index of the question currently shown. */
    currentIndex: number;
    /** Current lifecycle phase. */
    phase: QuizPhase;
    /** Error message (null when clean). */
    error: string | null;
    /** True while the initial quiz fetch is in flight. */
    isLoading: boolean;
    /** True while the submit request is in flight. */
    isSubmitting: boolean;

    /** Fetch the quiz for a lesson (idempotent — safe to call repeatedly). */
    loadQuiz: (lessonId: string) => Promise<void>;
    /** Record the learner's selected option for a question. */
    selectAnswer: (questionIndex: number, optionIndex: number) => void;
    /** Advance to the next question (no-op on the last question). */
    nextQuestion: () => void;
    /** Go back to the previous question (no-op on the first question). */
    prevQuestion: () => void;
    /** Jump directly to a question by index. */
    goToQuestion: (index: number) => void;
    /** Submit the quiz for grading. No-op if already submitting. */
    submit: () => Promise<void>;
    /** Reset to the "taking" phase for a retake (clears answers + result). */
    retake: () => void;
    /** Number of questions answered (non-null). */
    answeredCount: number;
};

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: React.ReactNode }) {
    const [quiz, setQuiz] = useState<QuizDetailDTO | null>(null);
    const [result, setResult] = useState<QuizResultResponseDTO | null>(null);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<QuizPhase>("loading");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadQuiz = useCallback(async (lessonId: string) => {
        setIsLoading(true);
        setError(null);
        setPhase("loading");
        try {
            const data = await getQuizForLesson(lessonId);
            setQuiz(data);
            setAnswers(new Array(data.questions.length).fill(null));
            setCurrentIndex(0);
            setResult(null);
            setPhase("taking");
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.detail
                    : err instanceof Error
                        ? err.message
                        : "Failed to load the quiz.";
            setError(message);
            setPhase("error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const selectAnswer = useCallback(
        (questionIndex: number, optionIndex: number) => {
            setAnswers((prev) => {
                const next = [...prev];
                next[questionIndex] = optionIndex;
                return next;
            });
        },
        [],
    );

    const nextQuestion = useCallback(() => {
        setCurrentIndex((prev) => {
            const max = quiz ? quiz.questions.length - 1 : 0;
            return Math.min(prev + 1, max);
        });
    }, [quiz]);

    const prevQuestion = useCallback(() => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }, []);

    const goToQuestion = useCallback(
        (index: number) => {
            const max = quiz ? quiz.questions.length - 1 : 0;
            setCurrentIndex(Math.max(0, Math.min(index, max)));
        },
        [quiz],
    );

    const submit = useCallback(async () => {
        if (!quiz || isSubmitting) return;
        setIsSubmitting(true);
        setPhase("submitting");
        setError(null);
        try {
            const data = await submitQuiz(quiz.id, { answers });
            setResult(data);
            setPhase("results");
            if (data.xp_awarded && data.xp_earned > 0) {
                toast.success(`+${data.xp_earned} XP earned!`);
            }
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.detail
                    : err instanceof Error
                        ? err.message
                        : "Failed to submit the quiz.";
            setError(message);
            // Return to the taking phase so the learner can retry.
            setPhase("taking");
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [quiz, answers, isSubmitting]);

    const retake = useCallback(() => {
        if (!quiz) return;
        setAnswers(new Array(quiz.questions.length).fill(null));
        setCurrentIndex(0);
        setResult(null);
        setError(null);
        setPhase("taking");
    }, [quiz]);

    const answeredCount = useMemo(
        () => answers.filter((a) => a !== null).length,
        [answers],
    );

    const value = useMemo<QuizContextValue>(
        () => ({
            quiz,
            result,
            answers,
            currentIndex,
            phase,
            error,
            isLoading,
            isSubmitting,
            loadQuiz,
            selectAnswer,
            nextQuestion,
            prevQuestion,
            goToQuestion,
            submit,
            retake,
            answeredCount,
        }),
        [
            quiz,
            result,
            answers,
            currentIndex,
            phase,
            error,
            isLoading,
            isSubmitting,
            loadQuiz,
            selectAnswer,
            nextQuestion,
            prevQuestion,
            goToQuestion,
            submit,
            retake,
            answeredCount,
        ],
    );

    return (
        <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
    );
}

export function useQuiz() {
    const context = useContext(QuizContext);
    if (!context) {
        throw new Error("useQuiz must be used within a QuizProvider.");
    }
    return context;
}
