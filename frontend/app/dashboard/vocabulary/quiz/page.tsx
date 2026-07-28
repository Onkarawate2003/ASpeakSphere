"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    HelpCircle,
    Loader2,
    RefreshCw,
    Sparkles,
    Trophy,
    XCircle,
    Zap,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard";
import {
    generateQuiz,
    submitQuiz,
    type QuizGenerateResponse,
    type QuizQuestion,
    type QuizSubmissionItem,
    type QuizSubmissionResponse,
} from "@/features/vocabulary/api";

export default function VocabularyQuizPage() {
    const [quizData, setQuizData] = useState<QuizGenerateResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Current quiz state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResponse | null>(null);

    const loadQuiz = async () => {
        setLoading(true);
        setError(null);
        setSubmissionResult(null);
        setSelectedAnswers({});
        setCurrentIndex(0);

        try {
            const data = await generateQuiz(5);
            setQuizData(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Could not generate quiz. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuiz();
    }, []);

    const handleSelectOption = (questionId: string, optionId: string) => {
        if (submissionResult) return; // Locked after submission
        setSelectedAnswers((prev) => ({
            ...prev,
            [questionId]: optionId,
        }));
    };

    const handleNext = () => {
        if (!quizData) return;
        if (currentIndex < quizData.questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleSubmitQuiz = async () => {
        if (!quizData || submitting) return;

        const submissionItems: QuizSubmissionItem[] = quizData.questions.map((q) => {
            const selectedOpt = selectedAnswers[q.id] || "";
            return {
                word: q.word,
                question_type: q.question_type,
                selected_option_id: selectedOpt,
                correct_option_id: q.correct_option_id,
                is_correct: selectedOpt === q.correct_option_id,
            };
        });

        setSubmitting(true);
        try {
            const result = await submitQuiz(submissionItems);
            setSubmissionResult(result);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to submit quiz answers.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Loading State
    // -----------------------------------------------------------------------
    if (loading) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-3xl space-y-6">
                    <div className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
                    <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
                </div>
            </DashboardLayout>
        );
    }

    // -----------------------------------------------------------------------
    // Error State
    // -----------------------------------------------------------------------
    if (error || !quizData) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-xl py-12">
                    <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                            <AlertCircle className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-slate-900">Quiz Generation Error</h3>
                        <p className="mt-2 text-sm text-slate-600">{error || "Unable to start quiz."}</p>
                        <button
                            type="button"
                            onClick={loadQuiz}
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try Again
                        </button>
                    </section>
                </div>
            </DashboardLayout>
        );
    }

    // -----------------------------------------------------------------------
    // Empty State (0 questions available)
    // -----------------------------------------------------------------------
    if (quizData.questions.length === 0) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-md py-12">
                    <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500">
                            <HelpCircle className="h-8 w-8" aria-hidden="true" />
                        </div>
                        <h3 className="mt-5 text-xl font-bold text-slate-900">No words available</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Save some words in the Vocabulary Coach to unlock personalized quizzes!
                        </p>
                        <Link
                            href="/dashboard/vocabulary"
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                        >
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                            Go to Vocabulary Coach
                        </Link>
                    </section>
                </div>
            </DashboardLayout>
        );
    }

    // -----------------------------------------------------------------------
    // Quiz Score & Review Screen (After Submission)
    // -----------------------------------------------------------------------
    if (submissionResult) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* Header Score Card */}
                    <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl">
                        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
                        <div className="relative text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <Trophy className="h-8 w-8" aria-hidden="true" />
                            </div>
                            <h1 className="text-3xl font-extrabold sm:text-4xl">Quiz Completed!</h1>
                            <p className="text-base text-slate-300">{quizData.source_summary}</p>

                            {/* Score Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                                <div className="rounded-2xl bg-white/5 p-3">
                                    <p className="text-xs text-slate-400 font-semibold uppercase">Score</p>
                                    <p className="text-2xl font-bold text-white">{submissionResult.score} / {submissionResult.total_questions}</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3">
                                    <p className="text-xs text-slate-400 font-semibold uppercase">Accuracy</p>
                                    <p className="text-2xl font-bold text-emerald-400">{submissionResult.accuracy_percentage}%</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3">
                                    <p className="text-xs text-slate-400 font-semibold uppercase">XP Earned</p>
                                    <p className="text-2xl font-bold text-amber-300">+{submissionResult.xp_earned} XP</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3">
                                    <p className="text-xs text-slate-400 font-semibold uppercase">Mastered</p>
                                    <p className="text-2xl font-bold text-sky-300">{submissionResult.mastered_count} Words</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={loadQuiz}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    Restart Quiz
                                </button>
                                <Link
                                    href="/dashboard/vocabulary/progress"
                                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                                >
                                    <Award className="h-4 w-4" aria-hidden="true" />
                                    View Mastery Progress
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* Detailed Answer Review */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">Answer Review</h2>
                        {quizData.questions.map((q, idx) => {
                            const userAns = selectedAnswers[q.id];
                            const isCorrect = userAns === q.correct_option_id;
                            const userAnsText = q.options.find((o) => o.id === userAns)?.text || "Not answered";
                            const correctAnsText = q.options.find((o) => o.id === q.correct_option_id)?.text || "";

                            return (
                                <div
                                    key={q.id}
                                    className={`rounded-3xl border p-6 shadow-sm transition space-y-3 ${
                                        isCorrect ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Question {idx + 1} &bull; {q.word}
                                        </span>
                                        {isCorrect ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                Correct
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                                Incorrect
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-base font-semibold text-slate-900">{q.question_text}</p>

                                    <div className="space-y-1 text-sm">
                                        <p className="text-slate-700">
                                            <span className="font-semibold text-slate-500">Your answer:</span>{" "}
                                            <span className={isCorrect ? "font-bold text-emerald-700" : "font-bold text-rose-600"}>
                                                {userAnsText}
                                            </span>
                                        </p>
                                        {!isCorrect && (
                                            <p className="text-slate-700">
                                                <span className="font-semibold text-slate-500">Correct answer:</span>{" "}
                                                <span className="font-bold text-emerald-700">{correctAnsText}</span>
                                            </p>
                                        )}
                                    </div>

                                    <p className="text-xs leading-5 text-slate-500 border-t border-slate-200/60 pt-2 font-medium">
                                        💡 {q.explanation}
                                    </p>
                                </div>
                            );
                        })}
                    </section>
                </div>
            </DashboardLayout>
        );
    }

    // -----------------------------------------------------------------------
    // Active Question Screen
    // -----------------------------------------------------------------------
    const currentQ: QuizQuestion = quizData.questions[currentIndex];
    const totalQ = quizData.questions.length;
    const progressPct = roundToDecimal(((currentIndex + 1) / totalQ) * 100, 0);
    const answeredCount = Object.keys(selectedAnswers).length;
    const isLastQuestion = currentIndex === totalQ - 1;

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-3xl space-y-6">
                {/* Header Progress Card */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
                            <h1 className="text-lg font-bold text-slate-900">Vocabulary Quiz</h1>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            Question {currentIndex + 1} of {totalQ}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs font-medium text-slate-400">
                            <span>{quizData.source_summary}</span>
                            <span>{answeredCount} of {totalQ} answered</span>
                        </div>
                    </div>
                </section>

                {/* Active Question Card */}
                <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                            {currentQ.question_type.replace("_", " ")}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            Word: {currentQ.word}
                        </span>
                    </div>

                    {/* Question Prompt */}
                    <h2 className="text-2xl font-bold text-slate-900 leading-snug">{currentQ.question_text}</h2>

                    {/* 4 Options Grid */}
                    <div className="grid gap-3">
                        {currentQ.options.map((option) => {
                            const isSelected = selectedAnswers[currentQ.id] === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelectOption(currentQ.id, option.id)}
                                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left font-medium transition focus:outline-none focus:ring-4 ${
                                        isSelected
                                            ? "border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-4 ring-blue-500/10 shadow-sm"
                                            : "border-slate-200 bg-slate-50/50 text-slate-800 hover:border-blue-200 hover:bg-blue-50/40"
                                    }`}
                                >
                                    <span className="text-base">{option.text}</span>
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                                            isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                                        }`}
                                    >
                                        {isSelected && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Previous
                        </button>

                        {isLastQuestion ? (
                            <button
                                type="button"
                                onClick={handleSubmitQuiz}
                                disabled={submitting || answeredCount < totalQ}
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Submitting...</>
                                ) : (
                                    <><Zap className="h-4 w-4" aria-hidden="true" />Submit Quiz</>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-blue-700"
                            >
                                Next
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}

function roundToDecimal(val: number, decimals: number) {
    return Number(val.toFixed(decimals));
}
