import { authedFetch } from "@/features/auth/api";

export type GrammarSeverity = "low" | "medium" | "high";

export type GrammarCorrection = {
    incorrect: string;
    correct: string;
    rule: string;
    reason: string;
    severity: GrammarSeverity;
};

export type GrammarCheckResponse = {
    grammar_score: number;
    original_sentence: string;
    corrected_sentence: string;
    tone: string;
    overall_feedback: string;
    corrections: GrammarCorrection[];
};

export function checkGrammar(sentence: string): Promise<GrammarCheckResponse> {
    return authedFetch<GrammarCheckResponse>("/grammar/check", {
        method: "POST",
        body: JSON.stringify({ sentence }),
    });
}
