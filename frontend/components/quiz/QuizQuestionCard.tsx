"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { useQuiz } from "@/features/quiz/QuizContext";

/**
 * Phase 11 — Quiz question card.
 *
 * Renders the current question and its options as selectable choices. The
 * selected option is highlighted; clicking a different option updates the
 * answer. The correct answer is NOT shown here (it's hidden until the
 * results screen) — this is the "taking" phase only.
 */
export default function QuizQuestionCard() {
    const { quiz, currentIndex, answers, selectAnswer } = useQuiz();

    if (!quiz) return null;

    const question = quiz.questions[currentIndex];
    if (!question) return null;

    const selected = answers[currentIndex];

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                    {currentIndex + 1}
                </span>
                <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
                    {question.question_text}
                </h2>
            </div>

            <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer choices">
                {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    return (
                        <button
                            key={optionIndex}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => selectAnswer(currentIndex, optionIndex)}
                            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                }`}
                        >
                            <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center ${isSelected ? "text-blue-600" : "text-slate-300"
                                    }`}
                                aria-hidden="true"
                            >
                                {isSelected ? (
                                    <CheckCircle2 className="h-6 w-6" />
                                ) : (
                                    <Circle className="h-6 w-6" />
                                )}
                            </span>
                            <span
                                className={`text-sm font-semibold sm:text-base ${isSelected ? "text-blue-900" : "text-slate-700"
                                    }`}
                            >
                                {option}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
