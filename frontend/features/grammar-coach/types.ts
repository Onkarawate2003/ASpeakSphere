export type GrammarDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type GrammarExample = {
    sentence: string;
    explanation: string;
};

export type GrammarMistake = {
    incorrect: string;
    correct: string;
};

export type GrammarTopic = {
    id: string;
    title: string;
    description: string;
    difficulty: GrammarDifficulty;
    definition: string;
    rules: string[];
    examples: GrammarExample[];
    commonMistakes: GrammarMistake[];
    quickTip: string;
};

export type GrammarCategory = {
    id: string;
    title: string;
    description: string;
    topics: GrammarTopic[];
};
