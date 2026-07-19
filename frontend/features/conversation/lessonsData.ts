/**
 * Phase 9 — Lesson catalog (frontend-only data source).
 *
 * Structured English lessons grouped by practice mode. Each lesson is a
 * self-contained unit that Emma teaches during a conversation session. The
 * catalog is intentionally a static frontend data file (no database table)
 * so lessons can be added/edited without a migration.
 *
 * Flow: Practice Mode → Lesson Selection → Conversation.
 * When a learner picks a lesson, its `id`, `title` and `objectives` are sent
 * to the backend and persisted with the conversation, so Emma can teach that
 * specific lesson and the history can display it.
 *
 * Each lesson:
 *   - id            — stable unique identifier (used as the `lesson` URL param)
 *   - title         — short, learner-facing lesson name
 *   - description   — one-line summary shown on the lesson card
 *   - difficulty    — Beginner | Intermediate | Advanced (reuses the badge type)
 *   - durationMin   — estimated minutes (shown on the card + summary)
 *   - objectives    — ordered list Emma guides the learner through
 *   - practiceType  — which practice mode this lesson belongs to
 */

import type { Difficulty, PracticeType } from "./types";

export type Lesson = {
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    durationMin: number;
    objectives: string[];
    practiceType: PracticeType;
};

// ─── Speaking ────────────────────────────────────────────────────────────────

const speakingLessons: Lesson[] = [
    {
        id: "speaking-introductions",
        title: "Introducing Yourself",
        description: "Confidently introduce yourself and share basic personal details.",
        difficulty: "Beginner",
        durationMin: 10,
        objectives: [
            "Greet someone and state your name clearly.",
            "Mention where you are from and what you do.",
            "Share one hobby or interest in a full sentence.",
            "Ask the other person a follow-up question.",
        ],
        practiceType: "speaking",
    },
    {
        id: "speaking-daily-routine",
        title: "Talking About Your Daily Routine",
        description: "Describe your day from morning to night using the present simple.",
        difficulty: "Beginner",
        durationMin: 12,
        objectives: [
            "Use time expressions like 'in the morning' and 'at night'.",
            "Describe at least four routine activities in the present simple.",
            "Link ideas with 'then', 'after that', and 'next'.",
            "Answer questions about your routine fluently.",
        ],
        practiceType: "speaking",
    },
    {
        id: "speaking-opinions",
        title: "Expressing Opinions",
        description: "Share and justify your opinions on everyday topics.",
        difficulty: "Intermediate",
        durationMin: 15,
        objectives: [
            "State an opinion using 'I think' and 'In my opinion'.",
            "Give at least one reason to support your view.",
            "Acknowledge a different perspective politely.",
            "Ask the other person what they think.",
        ],
        practiceType: "speaking",
    },
];

// ─── Listening ────────────────────────────────────────────────────────────────

const listeningLessons: Lesson[] = [
    {
        id: "listening-greetings",
        title: "Understanding Greetings & Small Talk",
        description: "Catch key words in short greetings and casual exchanges.",
        difficulty: "Beginner",
        durationMin: 10,
        objectives: [
            "Identify common greetings and responses.",
            "Recognise questions about name, origin, and wellbeing.",
            "Respond appropriately to small-talk prompts.",
            "Ask for repetition politely when needed.",
        ],
        practiceType: "listening",
    },
    {
        id: "listening-instructions",
        title: "Following Spoken Instructions",
        description: "Listen to short instructions and act on what you hear.",
        difficulty: "Beginner",
        durationMin: 12,
        objectives: [
            "Identify action verbs in spoken instructions.",
            "Recognise sequence words like 'first' and 'finally'.",
            "Summarise the steps back in your own words.",
            "Ask a clarifying question about a missed detail.",
        ],
        practiceType: "listening",
    },
    {
        id: "listening-story",
        title: "Listening to a Short Story",
        description: "Follow a brief narrative and answer comprehension questions.",
        difficulty: "Intermediate",
        durationMin: 15,
        objectives: [
            "Identify the main characters and setting.",
            "Catch the sequence of events in order.",
            "Answer who, what, where, and when questions.",
            "Predict what might happen next and explain why.",
        ],
        practiceType: "listening",
    },
];

// ─── Vocabulary ──────────────────────────────────────────────────────────────

const vocabularyLessons: Lesson[] = [
    {
        id: "vocabulary-everyday-words",
        title: "Everyday Essential Words",
        description: "Learn high-frequency words for daily conversations.",
        difficulty: "Beginner",
        durationMin: 10,
        objectives: [
            "Learn five common everyday words and their meanings.",
            "Hear each word used in an example sentence.",
            "Use each new word in your own sentence.",
            "Recall the words in a quick review round.",
        ],
        practiceType: "vocabulary",
    },
    {
        id: "vocabulary-food",
        title: "Food & Restaurant Vocabulary",
        description: "Order meals and describe food with the right words.",
        difficulty: "Beginner",
        durationMin: 12,
        objectives: [
            "Learn key food and menu vocabulary.",
            "Practice ordering a meal politely.",
            "Describe how food tastes using adjectives.",
            "Ask about ingredients and recommendations.",
        ],
        practiceType: "vocabulary",
    },
    {
        id: "vocabulary-work",
        title: "Workplace & Office Vocabulary",
        description: "Talk about jobs, meetings, and tasks at work.",
        difficulty: "Intermediate",
        durationMin: 15,
        objectives: [
            "Learn common workplace nouns and verbs.",
            "Describe your job role and responsibilities.",
            "Use phrases for meetings and deadlines.",
            "Discuss a typical workday using new vocabulary.",
        ],
        practiceType: "vocabulary",
    },
];

// ─── Grammar ──────────────────────────────────────────────────────────────────

const grammarLessons: Lesson[] = [
    {
        id: "grammar-present-simple",
        title: "Present Simple Tense",
        description: "Master habits, facts, and routines with the present simple.",
        difficulty: "Beginner",
        durationMin: 12,
        objectives: [
            "Form affirmative, negative, and question sentences.",
            "Add the correct '-s' for he/she/it subjects.",
            "Describe a routine using the present simple.",
            "Fix common present-simple mistakes in your sentences.",
        ],
        practiceType: "grammar",
    },
    {
        id: "grammar-past-simple",
        title: "Past Simple Tense",
        description: "Talk about finished events and past experiences.",
        difficulty: "Intermediate",
        durationMin: 15,
        objectives: [
            "Form regular and common irregular past verbs.",
            "Build negative and question sentences in the past.",
            "Narrate a short past event in order.",
            "Correct past-tense errors in your own writing.",
        ],
        practiceType: "grammar",
    },
    {
        id: "grammar-articles",
        title: "Articles: a, an, the",
        description: "Choose the right article for nouns in context.",
        difficulty: "Intermediate",
        durationMin: 12,
        objectives: [
            "Distinguish between 'a', 'an', and 'the'.",
            "Identify when no article is needed.",
            "Correct article mistakes in example sentences.",
            "Use articles correctly in your own descriptions.",
        ],
        practiceType: "grammar",
    },
];

// ─── Pronunciation ───────────────────────────────────────────────────────────

const pronunciationLessons: Lesson[] = [
    {
        id: "pronunciation-sounds",
        title: "Tricky English Sounds",
        description: "Focus on sounds that are hard for many learners.",
        difficulty: "Beginner",
        durationMin: 10,
        objectives: [
            "Identify commonly confused vowel sounds.",
            "Practice minimal pairs to hear the difference.",
            "Learn syllable stress for key example words.",
            "Produce the target sounds in short sentences.",
        ],
        practiceType: "pronunciation",
    },
    {
        id: "pronunciation-stress",
        title: "Word Stress & Rhythm",
        description: "Stress the right syllable for clearer speech.",
        difficulty: "Intermediate",
        durationMin: 12,
        objectives: [
            "Identify the stressed syllable in two-syllable words.",
            "Understand how stress changes meaning (record/record).",
            "Practice sentence rhythm with content and function words.",
            "Apply correct stress in your own sentences.",
        ],
        practiceType: "pronunciation",
    },
    {
        id: "pronunciation-linking",
        title: "Connected Speech & Linking",
        description: "Sound natural by linking words in fluent speech.",
        difficulty: "Advanced",
        durationMin: 15,
        objectives: [
            "Recognise consonant-to-vowel linking.",
            "Practice common reductions like 'gonna' and 'wanna'.",
            "Blend words smoothly in short phrases.",
            "Read a short paragraph with natural linking.",
        ],
        practiceType: "pronunciation",
    },
];

// ─── Catalog ─────────────────────────────────────────────────────────────────

/**
 * All lessons, grouped by practice type. Use `getLessonsForPractice` to fetch
 * the lessons for a single mode, or `ALL_LESSONS` when you need the full list.
 */
export const LESSONS_BY_PRACTICE: Record<PracticeType, Lesson[]> = {
    speaking: speakingLessons,
    listening: listeningLessons,
    vocabulary: vocabularyLessons,
    grammar: grammarLessons,
    pronunciation: pronunciationLessons,
};

/** Flat list of every lesson in the catalog. */
export const ALL_LESSONS: Lesson[] = [
    ...speakingLessons,
    ...listeningLessons,
    ...vocabularyLessons,
    ...grammarLessons,
    ...pronunciationLessons,
];

/**
 * Return the lessons available for a given practice mode.
 * Always returns an array (empty for an unknown mode, though that cannot
 * happen with the typed `PracticeType`).
 */
export function getLessonsForPractice(practiceType: PracticeType): Lesson[] {
    return LESSONS_BY_PRACTICE[practiceType] ?? [];
}

/**
 * Look up a single lesson by its id across all practice modes.
 * Returns `undefined` when no lesson matches — callers should guard for that.
 */
export function getLessonById(lessonId: string | null | undefined): Lesson | undefined {
    if (!lessonId) return undefined;
    return ALL_LESSONS.find((lesson) => lesson.id === lessonId);
}
