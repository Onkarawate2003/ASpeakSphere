import type { Difficulty, PracticeType } from "./types";

/** AI tutor identity. */
export const TUTOR_NAME = "Emma";
export const TUTOR_SUBTITLE = "Your AI English Coach";

/** Initial shown before the user's name is known. */
const DEFAULT_GREETING = "Hello there!";

/**
 * Build the first AI message shown when a session starts.
 *
 * Produces a warm, multi-line greeting that:
 *  - addresses the user by name (falls back to "Hello there!" when the
 *    name is unavailable),
 *  - introduces Emma as the AI English Coach,
 *  - references the selected practice mode dynamically,
 *  - reassures the learner about mistakes and pacing,
 *  - ends with a clear first prompt ("introduce yourself").
 */
export function buildFirstAIMessage(
    practiceLabel: string,
    userName?: string | null,
): string {
    const greeting = userName && userName.trim() ? `Hello ${userName.trim()}! 👋` : `${DEFAULT_GREETING} 👋`;

    return [
        greeting,
        "",
        "I'm Emma, your AI English Coach.",
        "",
        `Today we'll practice ${practiceLabel}.`,
        "",
        "Don't worry about making mistakes.",
        "Take your time.",
        "",
        "Let's begin by introducing yourself.",
    ].join("\n");
}

/** Welcome headline shown before the session starts. */
export const WELCOME_HEADLINE = "Welcome!";

/** Welcome body shown before the session starts. */
export const WELCOME_BODY = 'Press "Start Conversation" to begin your AI practice session.';

/** CTA label on the welcome screen. */
export const START_CONVERSATION_LABEL = "Start Conversation";

/**
 * Dynamic welcome message shown in the TutorHero, tailored to the selected
 * practice mode.
 */
export const PRACTICE_WELCOME_MESSAGES: Record<PracticeType, string> = {
    speaking:
        "Let's work on your spoken fluency. I'll ask guided questions and you'll answer out loud — take your time, there are no wrong answers.",
    listening:
        "Today we'll train your ear. I'll share short passages and ask you to respond, so you can practice understanding natural English.",
    vocabulary:
        "We'll build your word power for real situations. I'll introduce useful phrases and help you use them in context.",
    grammar:
        "Let's polish your grammar. I'll guide you through common speaking mistakes and help you sound more natural.",
    pronunciation:
        "We'll focus on clarity, rhythm, and stress. Repeat after me and I'll help you refine how each phrase sounds.",
};

/** Human-readable labels for each practice type. */
export const PRACTICE_LABELS: Record<PracticeType, string> = {
    speaking: "Speaking Practice",
    listening: "Listening Practice",
    vocabulary: "Vocabulary Practice",
    grammar: "Grammar Practice",
    pronunciation: "Pronunciation Practice",
};

/**
 * Dynamic input placeholder per practice mode.
 * Used by ConversationInput so the prompt adapts to the selected mode
 * instead of being hardcoded.
 */
export const PRACTICE_INPUT_PLACEHOLDERS: Record<PracticeType, string> = {
    speaking: "Tell Emma about yourself...",
    grammar: "Write a sentence to check...",
    vocabulary: "Use a new vocabulary word...",
    listening: "Ask Emma about today's exercise...",
    pronunciation: "Type the sentence you want to practice...",
};

/** Fallback placeholder when no practice mode is selected / session inactive. */
export const DEFAULT_INPUT_PLACEHOLDER = "Start a conversation to begin chatting...";

/** Difficulty badge per practice type. */
export const PRACTICE_DIFFICULTY: Record<PracticeType, Difficulty> = {
    speaking: "Intermediate",
    listening: "Beginner",
    vocabulary: "Beginner",
    grammar: "Advanced",
    pronunciation: "Intermediate",
};

/** Conversation tips shown in the sidebar. */
export const CONVERSATION_TIPS: string[] = [
    "Speak in full sentences when possible.",
    "It's okay to pause and think — take your time.",
    "Ask the tutor to repeat or rephrase if needed.",
    "Focus on clarity over speed.",
];

/** Today's goal copy shown in the sidebar. */
export const TODAY_GOAL_LABEL = "Complete a 10-minute practice session";

/** Default current level shown in the sidebar. */
export const CURRENT_LEVEL_LABEL = "Intermediate (B1)";

/* ============================================================
 * Phase 3 — Simulated AI Conversation Engine (frontend only)
 * ============================================================ */

/**
 * Delay (ms) between the user sending a message and Emma's reply
 * appearing. During this window the typing indicator is shown so the
 * conversation feels natural rather than instant.
 */
export const TYPING_DELAY_MS = 1200;

/**
 * Number of user messages after which the practice session is marked
 * complete (progress → 100%, "Practice Completed 🎉", input disabled).
 */
export const MAX_USER_MESSAGES = 10;

/** Banner text shown when the practice session is completed. */
export const PRACTICE_COMPLETED_MESSAGE = "Practice Completed 🎉";

/** Headline shown on the session summary card once the practice is done. */
export const SESSION_COMPLETED_HEADLINE = "🎉 Session Completed";

/** Label shown above the participation score on the summary card. */
export const PARTICIPATION_LABEL = "Participation";

/** Label shown above the messages breakdown on the summary card. */
export const MESSAGES_LABEL = "Messages";

/** Label shown above the practice mode on the summary card. */
export const PRACTICE_LABEL_SUMMARY = "Practice";

/** Label shown above the duration on the summary card. */
export const DURATION_LABEL = "Duration";

/** Label shown above the progress on the summary card. */
export const PROGRESS_LABEL = "Progress";

/** Filename used when exporting the conversation as a text file. */
export const EXPORT_FILENAME = "conversation.txt";

/** Toast message shown after copying the conversation to the clipboard. */
export const COPY_SUCCESS_MESSAGE = "Conversation copied successfully.";

/** Toast message shown when copying the conversation fails. */
export const COPY_ERROR_MESSAGE = "Could not copy the conversation. Please try again.";

/** Default export file header line. */
export const EXPORT_HEADER = "SpeakSphere Conversation";

/**
 * Practice-specific simulated AI responses.
 *
 * These are generic but encouraging tutor replies. The engine rotates
 * through them (never repeating the same reply twice in a row) so the
 * conversation feels varied without any backend or NLP.
 */
export const AI_RESPONSES: Record<PracticeType, string[]> = {
    speaking: [
        "Tell me more about that.",
        "That's interesting! Can you elaborate?",
        "Great point. What happened next?",
        "I like how you expressed that. Let's keep going.",
        "Can you explain it in a different way?",
        "Wonderful! Try adding a few more details.",
        "Good effort! Let's try another sentence.",
        "That's a great example. What else comes to mind?",
    ],
    grammar: [
        "Good sentence! Watch the verb tense there.",
        "Almost — try using the past simple here.",
        "Nice structure. Remember the article before the noun.",
        "Let's refine that: subject-verb agreement is key.",
        "Well done! Now try it in the negative form.",
        "Close! The preposition should be 'at' in this context.",
        "Great attempt. Plural nouns need an 's' here.",
        "Good! Now let's try a question form.",
    ],
    vocabulary: [
        "Excellent word choice! Can you use it in another sentence?",
        "Great vocabulary! Try pairing it with a strong adjective.",
        "Nice! That word fits perfectly here.",
        "Good usage. Let's learn a related word next.",
        "Well done! Try combining it with an adverb.",
        "That's a useful phrase. Where else could you use it?",
        "Fantastic! Let's add another word to your list.",
        "Good pick! Can you think of its opposite?",
    ],
    listening: [
        "Good! Now try summarizing what you heard.",
        "Can you tell me the main idea in your own words?",
        "Great listening! What detail stood out to you?",
        "Well done! Let's try a slightly faster version next.",
        "Nice work. Did you catch the key phrase?",
        "Good effort! Try listening for the specific names.",
        "Excellent! Now predict what comes next.",
        "Great! Can you repeat the sentence you heard?",
    ],
    pronunciation: [
        "Good try! Focus on the stress of the first syllable.",
        "Nice! Let's slow it down and try again.",
        "Almost there — watch the 'th' sound.",
        "Great effort! Try linking those two words together.",
        "Good! Now exaggerate the vowel sound slightly.",
        "Well done! Let's practice the intonation pattern.",
        "Nice! Repeat after me one more time.",
        "Good rhythm! Try it a little faster now.",
    ],
};

/**
 * Suggested prompt chips shown below the welcome message.
 *
 * Each chip is a ready-made user message. Clicking one starts the
 * session (if not started) and sends the prompt immediately, so the
 * learner can begin practicing with a single click.
 */
export const SUGGESTED_PROMPTS: Record<PracticeType, string[]> = {
    speaking: [
        "Introduce yourself",
        "Talk about your hobbies",
        "Describe your hometown",
    ],
    grammar: [
        "Write a sentence in the past tense",
        "Use 'have been' in a sentence",
        "Compare two things you like",
    ],
    vocabulary: [
        "Use 'ambitious' in a sentence",
        "Name three synonyms for 'happy'",
        "Describe your day with new words",
    ],
    listening: [
        "Read a short passage to me",
        "Summarize today's exercise",
        "Ask me to repeat a sentence",
    ],
    pronunciation: [
        "Help me pronounce 'thought'",
        "Practice the 'th' sound",
        "Read this sentence aloud",
    ],
};
