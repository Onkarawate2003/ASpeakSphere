"""Seed data for the Lesson Assessment (Quiz) system.

Phase 11 — Assessment (Quiz) Module.

This module provides the quiz content for every lesson in the frontend
catalog (``frontend/features/conversation/lessonsData.ts``). The seed is
idempotent: :func:`seed_quizzes` upserts each quiz by ``lesson_id`` so
running it multiple times is safe (it updates existing quizzes in place
rather than duplicating them, thanks to the ``uq_quizzes_lesson_id``
unique constraint).

Each quiz has 4 MCQ questions with 4 options and 1 correct answer, plus an
explanation shown on the results screen. The questions test the lesson's
objectives so the assessment is a natural continuation of the learning
journey (Lesson → Conversation Practice → Assessment → XP → Progress).

Future assessment types (Grammar, Vocabulary, Pronunciation, Listening,
Adaptive AI Quiz, Speaking Assessment) simply add more seed entries with
their own ``lesson_id`` values — the engine is generic.
"""

import json
import logging
from typing import Dict, List

from sqlalchemy.orm import Session

from app.models.quizzes import Quiz, QuizQuestion

logger = logging.getLogger(__name__)


def _q(
    text: str,
    options: List[str],
    correct_index: int,
    explanation: str,
    order: int,
) -> dict:
    """Build a question dict for the seed."""
    return {
        "question_text": text,
        "options": options,
        "correct_answer_index": correct_index,
        "explanation": explanation,
        "display_order": order,
    }


# --------------------------------------------------------------------- #
# Quiz seed data — one entry per lesson in the frontend catalog.
# --------------------------------------------------------------------- #

QUIZ_SEED: Dict[str, dict] = {
    # ─── Speaking ───────────────────────────────────────────────────────
    "speaking-introductions": {
        "title": "Introducing Yourself — Assessment",
        "description": "Test what you learned about confident self-introductions.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which phrase is the most natural way to greet someone and "
                "introduce yourself?",
                ["What is your name?", "Hi, I'm Sarah. Nice to meet you.", "Tell me your name.", "Name please."],
                1,
                "A friendly greeting followed by your name and a pleasantry "
                "is the most natural opener.",
                1,
            ),
            _q(
                "When sharing where you are from, which sentence is correct?",
                ["I from Brazil.", "I am come from Brazil.", "I'm from Brazil.", "I coming from Brazil."],
                2,
                "'I'm from [place]' uses the correct preposition 'from' with "
                "the verb 'to be'.",
                2,
            ),
            _q(
                "Which sentence correctly shares a hobby in a full sentence?",
                ["I like swim.", "I enjoy swimming on weekends.", "I swimming.", "I likes swimming."],
                1,
                "'I enjoy swimming' uses the gerund 'swimming' after 'enjoy' "
                "and forms a complete sentence.",
                3,
            ),
            _q(
                "What is a good follow-up question after introducing yourself?",
                ["Goodbye.", "What about you? What do you do?", "I am tired.", "Stop talking."],
                1,
                "Asking 'What about you?' keeps the conversation going and "
                "shows interest in the other person.",
                4,
            ),
        ],
    },
    "speaking-daily-routine": {
        "title": "Daily Routine — Assessment",
        "description": "Check your understanding of present simple and routine vocabulary.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which time expression is correct for the morning?",
                ["at the morning", "in the morning", "on the morning", "to the morning"],
                1,
                "We use 'in' with parts of the day: in the morning, in the "
                "afternoon, in the evening (but 'at night').",
                1,
            ),
            _q(
                "Choose the correct present simple sentence about a routine.",
                ["I wakes up at 7.", "I wake up at 7.", "I waking up at 7.", "I am wake up at 7."],
                1,
                "With 'I' we use the base form of the verb: 'I wake up'. "
                "The '-s' is only for he/she/it.",
                2,
            ),
            _q(
                "Which linking word shows the next step in a sequence?",
                ["but", "because", "then", "although"],
                2,
                "'Then' signals the next action in a sequence of routine "
                "events.",
                3,
            ),
            _q(
                "How many routine activities should you aim to describe in "
                "the present simple?",
                ["One", "At least four", "Ten", "None"],
                1,
                "The lesson objective is to describe at least four routine "
                "activities to build fluency.",
                4,
            ),
        ],
    },
    "speaking-opinions": {
        "title": "Expressing Opinions — Assessment",
        "description": "Verify you can state, support, and discuss opinions.",
        "difficulty": "Intermediate",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which phrase clearly states an opinion?",
                ["The weather is sunny.", "I think that reading is relaxing.", "She went home.", "It is 3 o'clock."],
                1,
                "'I think that …' is a direct, natural way to state a "
                "personal opinion.",
                1,
            ),
            _q(
                "What should you include to support your opinion?",
                ["A random fact", "At least one reason", "A song", "Nothing"],
                1,
                "Giving at least one reason makes your opinion more "
                "persuasive and complete.",
                2,
            ),
            _q(
                "Which response politely acknowledges a different perspective?",
                ["You are wrong.", "I see your point, but …", "That is stupid.", "Stop talking."],
                1,
                "'I see your point, but …' acknowledges the other view "
                "respectfully before offering yours.",
                3,
            ),
            _q(
                "What is a good way to invite the other person's opinion?",
                ["I am done.", "What do you think?", "I do not care.", "Bye."],
                1,
                "Asking 'What do you think?' invites the other person to "
                "share their perspective, keeping the dialogue open.",
                4,
            ),
        ],
    },
    # ─── Listening ──────────────────────────────────────────────────────
    "listening-greetings": {
        "title": "Greetings & Small Talk — Assessment",
        "description": "Test your understanding of greetings and small talk.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which is a common English greeting?",
                ["Goodbye!", "How are you?", "See you later.", "Good night."],
                1,
                "'How are you?' is a standard greeting that opens small talk.",
                1,
            ),
            _q(
                "A natural response to 'How are you?' is:",
                ["I am a teacher.", "I'm fine, thanks. And you?", "It is raining.", "I am 25."],
                1,
                "'I'm fine, thanks. And you?' is a polite, common response "
                "that returns the question.",
                2,
            ),
            _q(
                "Which question asks about your name?",
                ["Where are you from?", "What is your name?", "How old are you?", "What do you do?"],
                1,
                "'What is your name?' directly asks for the person's name.",
                3,
            ),
            _q(
                "How do you politely ask someone to repeat what they said?",
                ["What?!", "Sorry, could you say that again?", "Speak louder.", "I did not hear."],
                1,
                "'Sorry, could you say that again?' is a polite way to ask "
                "for repetition.",
                4,
            ),
        ],
    },
    "listening-instructions": {
        "title": "Following Instructions — Assessment",
        "description": "Check your ability to follow spoken instructions.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which word is an action verb commonly found in instructions?",
                ["beautiful", "open", "slowly", "happy"],
                1,
                "'Open' is an action verb (imperative) used in instructions.",
                1,
            ),
            _q(
                "Which word signals the first step in a sequence?",
                ["finally", "then", "first", "next"],
                2,
                "'First' signals the beginning of an ordered sequence of "
                "steps.",
                2,
            ),
            _q(
                "What should you do after hearing instructions?",
                ["Ignore them", "Summarise the steps back", "Leave the room", "Sleep"],
                1,
                "Summarising the steps confirms your understanding and helps "
                "you remember them.",
                3,
            ),
            _q(
                "If you miss a detail, what is a good clarifying question?",
                ["Whatever.", "Could you explain that last step again?", "I do not care.", "Move on."],
                1,
                "Asking to explain a specific step again clarifies the "
                "missed detail politely.",
                4,
            ),
        ],
    },
    "listening-story": {
        "title": "Listening to a Story — Assessment",
        "description": "Test your comprehension of a short narrative.",
        "difficulty": "Intermediate",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "What should you identify first when listening to a story?",
                ["The price", "The main characters and setting", "The weather forecast", "The recipe"],
                1,
                "Identifying the main characters and setting gives you the "
                "foundation to follow the plot.",
                1,
            ),
            _q(
                "Why is it important to catch the sequence of events?",
                ["To memorise dates", "To understand the plot in order", "To count words", "To find rhymes"],
                1,
                "Following the sequence of events in order is essential to "
                "understanding the story's plot.",
                2,
            ),
            _q(
                "Which type of question helps check comprehension of a story?",
                ["Who, what, where, and when questions", "Math equations", "Spelling tests", "Cooking tips"],
                0,
                "Who/what/where/when questions directly test your "
                "understanding of the story's key details.",
                3,
            ),
            _q(
                "What is a good way to show deeper understanding of a story?",
                ["Repeat it word for word", "Predict what might happen next and explain why", "Count the words", "Draw a map"],
                1,
                "Predicting what might happen next and explaining why shows "
                "you understand the story's direction and logic.",
                4,
            ),
        ],
    },
    # ─── Vocabulary ─────────────────────────────────────────────────────
    "vocabulary-everyday-words": {
        "title": "Everyday Words — Assessment",
        "description": "Review high-frequency everyday vocabulary.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which word means 'a place where you buy things'?",
                ["school", "shop", "river", "cloud"],
                1,
                "A 'shop' is a place where you buy things.",
                1,
            ),
            _q(
                "Choose the word that means 'to move your body to music'.",
                ["sing", "dance", "write", "sleep"],
                1,
                "'Dance' means to move your body rhythmically to music.",
                2,
            ),
            _q(
                "Which sentence uses a new word correctly?",
                ["I water the friend.", "I bought bread at the bakery.", "I sky the bread.", "I bakery the bread."],
                1,
                "'I bought bread at the bakery' uses 'bakery' correctly as a "
                "place and 'bread' as the item.",
                3,
            ),
            _q(
                "What helps you recall new words quickly?",
                ["A quick review round", "Sleeping", "Ignoring them", "Watching TV silently"],
                0,
                "A quick review round reinforces memory and helps you recall "
                "the new words.",
                4,
            ),
        ],
    },
    "vocabulary-food": {
        "title": "Food & Restaurant Vocabulary — Assessment",
        "description": "Test your food and restaurant vocabulary.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which word describes how sweet food tastes?",
                ["salty", "sour", "sweet", "spicy"],
                2,
                "'Sweet' describes a sugary, pleasant taste.",
                1,
            ),
            _q(
                "What is a polite way to order a meal?",
                ["Give me a burger.", "I'd like a burger, please.", "Burger now.", "You, burger."],
                1,
                "'I'd like a …, please' is a polite way to order food.",
                2,
            ),
            _q(
                "Which adjective describes food that is hot and peppery?",
                ["bland", "spicy", "cold", "sweet"],
                1,
                "'Spicy' describes food with a hot, peppery flavour.",
                3,
            ),
            _q(
                "What can you ask to learn about a dish's ingredients?",
                ["How much?", "What's in this dish?", "Is it fast?", "Where is the door?"],
                1,
                "Asking 'What's in this dish?' helps you learn about the "
                "ingredients.",
                4,
            ),
        ],
    },
    "vocabulary-work": {
        "title": "Workplace Vocabulary — Assessment",
        "description": "Review workplace and office vocabulary.",
        "difficulty": "Intermediate",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which word means 'a scheduled gathering to discuss work'?",
                ["meeting", "holiday", "lunch", "weekend"],
                0,
                "A 'meeting' is a scheduled gathering to discuss work.",
                1,
            ),
            _q(
                "Which phrase talks about a time limit for a task?",
                ["on vacation", "by the deadline", "at lunch", "in the park"],
                1,
                "'By the deadline' refers to the time limit for completing "
                "a task.",
                2,
            ),
            _q(
                "Choose the sentence that describes a job role correctly.",
                ["I am a meeting.", "I am responsible for marketing.", "I deadline the office.", "I schedule the holiday."],
                1,
                "'I am responsible for marketing' describes a job role using "
                "workplace vocabulary.",
                3,
            ),
            _q(
                "Which verb means 'to talk about something at a meeting'?",
                ["discuss", "eat", "sleep", "drive"],
                0,
                "'Discuss' means to talk about something, often at a meeting.",
                4,
            ),
        ],
    },
    # ─── Grammar ────────────────────────────────────────────────────────
    "grammar-present-simple": {
        "title": "Present Simple — Assessment",
        "description": "Test your mastery of the present simple tense.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Choose the correct affirmative sentence in present simple.",
                ["She go to school.", "She goes to school.", "She going to school.", "She is go to school."],
                1,
                "With he/she/it we add '-s': 'She goes to school.'",
                1,
            ),
            _q(
                "Which is the correct negative form?",
                ["She don't like tea.", "She doesn't like tea.", "She not like tea.", "She isn't like tea."],
                1,
                "With he/she/it we use 'doesn't' + base verb: 'She doesn't "
                "like tea.'",
                2,
            ),
            _q(
                "Which is the correct question form?",
                ["Do she plays tennis?", "Does she play tennis?", "Is she play tennis?", "She does play tennis?"],
                1,
                "Questions with he/she/it use 'Does' + subject + base verb: "
                "'Does she play tennis?'",
                3,
            ),
            _q(
                "Which sentence correctly describes a routine?",
                ["I am work at 9.", "I work at 9 every day.", "I working at 9.", "I works at 9."],
                1,
                "'I work at 9 every day' uses the base form with 'I' to "
                "describe a routine.",
                4,
            ),
        ],
    },
    "grammar-past-simple": {
        "title": "Past Simple — Assessment",
        "description": "Check your understanding of the past simple tense.",
        "difficulty": "Intermediate",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which is the correct regular past form of 'play'?",
                ["playd", "played", "plaied", "playing"],
                1,
                "Regular verbs add '-ed': 'played'.",
                1,
            ),
            _q(
                "What is the past simple of the irregular verb 'go'?",
                ["goed", "gone", "went", "going"],
                2,
                "'Go' is irregular: its past simple form is 'went'.",
                2,
            ),
            _q(
                "Which is the correct negative past sentence?",
                ["I didn't went there.", "I didn't go there.", "I don't go there.", "I wasn't go there."],
                1,
                "In the negative, we use 'didn't' + base verb: 'I didn't go "
                "there.'",
                3,
            ),
            _q(
                "Which question is in the past simple?",
                ["Do you see it?", "Did you see it?", "Are you seeing it?", "You saw it?"],
                1,
                "Past simple questions use 'Did' + subject + base verb: "
                "'Did you see it?'",
                4,
            ),
        ],
    },
    "grammar-articles": {
        "title": "Articles (a/an/the) — Assessment",
        "description": "Test your use of articles a, an, and the.",
        "difficulty": "Intermediate",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which article is correct before 'apple'?",
                ["a", "an", "the", "no article"],
                1,
                "We use 'an' before a vowel sound: 'an apple'.",
                1,
            ),
            _q(
                "Which article is correct before 'university'?",
                ["a", "an", "the", "no article"],
                0,
                "'University' starts with a 'yoo' consonant sound, so we "
                "use 'a': 'a university'.",
                2,
            ),
            _q(
                "When do we use 'the'?",
                ["For any singular noun", "For a specific, known thing", "Only for plurals", "Never"],
                1,
                "We use 'the' for a specific or already-known thing.",
                3,
            ),
            _q(
                "Which sentence needs NO article?",
                ["I love the music.", "I love music in general.", "I love a music.", "I love an music."],
                1,
                "General, uncountable concepts like 'music' often need no "
                "article: 'I love music.'",
                4,
            ),
        ],
    },
    # ─── Pronunciation ─────────────────────────────────────────────────
    "pronunciation-sounds": {
        "title": "Tricky Sounds — Assessment",
        "description": "Review commonly confused English sounds.",
        "difficulty": "Beginner",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "Which pair is a minimal pair (differs by one sound)?",
                ["cat / dog", "ship / sheep", "run / walk", "big / large"],
                1,
                "'ship / sheep' differ only in the vowel sound — a classic "
                "minimal pair.",
                1,
            ),
            _q(
                "Which vowel sound is commonly confused by learners?",
                ["the 'b' sound", "the 'ee' vs 'i' sound", "the 'k' sound", "the 't' sound"],
                1,
                "The 'ee' (as in sheep) vs 'i' (as in ship) vowel sound is a "
                "common confusion.",
                2,
            ),
            _q(
                "What are minimal pairs used for?",
                ["To learn grammar", "To hear the difference between sounds", "To count syllables", "To write essays"],
                1,
                "Minimal pairs train your ear to distinguish between similar "
                "sounds.",
                3,
            ),
            _q(
                "What helps you produce a target sound in sentences?",
                ["Reading silently", "Practising the sound in short sentences", "Closing your eyes", "Skipping the sound"],
                1,
                "Practising the target sound in short sentences helps you "
                "produce it naturally.",
                4,
            ),
        ],
    },
    "pronunciation-stress": {
        "title": "Word Stress & Rhythm — Assessment",
        "description": "Test your understanding of word stress.",
        "difficulty": "Intermediate",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "In a two-syllable word, the stressed syllable is:",
                ["Always the first", "Always the second", "The one said louder and longer", "Neither"],
                2,
                "The stressed syllable is the one said louder, longer, and "
                "clearer.",
                1,
            ),
            _q(
                "Which pair shows stress changing meaning?",
                ["cat / cats", "record (noun) / record (verb)", "run / runs", "big / bigger"],
                1,
                "'REcord (noun) vs reCORD (verb)' — stress shifts change "
                "the meaning and part of speech.",
                2,
            ),
            _q(
                "Which type of words are usually stressed in a sentence?",
                ["Function words (a, the, of)", "Content words (nouns, verbs)", "All words equally", "Only the last word"],
                1,
                "Content words (nouns, main verbs, adjectives) are stressed; "
                "function words are usually reduced.",
                3,
            ),
            _q(
                "What is sentence rhythm based on?",
                ["Random pauses", "The pattern of stressed and unstressed words", "Loudness only", "Speed only"],
                1,
                "Sentence rhythm comes from the alternating pattern of "
                "stressed and unstressed words.",
                4,
            ),
        ],
    },
    "pronunciation-linking": {
        "title": "Connected Speech — Assessment",
        "description": "Check your understanding of linking in fluent speech.",
        "difficulty": "Advanced",
        "passing_score_percent": 50,
        "questions": [
            _q(
                "What is consonant-to-vowel linking?",
                ["Dropping consonants", "Connecting a word's final consonant to the next vowel", "Adding extra vowels", "Silent reading"],
                1,
                "Consonant-to-vowel linking connects a word ending in a "
                "consonant to the next word starting with a vowel.",
                1,
            ),
            _q(
                "Which is a common reduction in spoken English?",
                ["going to → gonna", "the → thee", "and → ant", "is → iz"],
                0,
                "'going to' often reduces to 'gonna' in casual speech.",
                2,
            ),
            _q(
                "What helps you blend words smoothly?",
                ["Pausing between every word", "Practising common phrases with linking", "Shouting", "Reading one word at a time"],
                1,
                "Practising common phrases with linking trains you to blend "
                "words smoothly.",
                3,
            ),
            _q(
                "What is the goal of connected speech practice?",
                ["To speak as fast as possible", "To sound more natural and fluent", "To memorise every word", "To avoid vowels"],
                1,
                "Connected speech practice aims to make you sound more "
                "natural and fluent.",
                4,
            ),
        ],
    },
}


def seed_quizzes(db: Session) -> int:
    """Upsert all seed quizzes (and their questions) into the database.

    Idempotent: if a quiz for a ``lesson_id`` already exists, its fields and
    questions are updated in place (the unique constraint on ``lesson_id``
    prevents duplicates). Returns the number of quizzes upserted.

    Called once on application startup (see ``main.py``) so the quiz content
    is always present without a manual seeding step.
    """
    count = 0
    for lesson_id, data in QUIZ_SEED.items():
        quiz = (
            db.query(Quiz)
            .filter(Quiz.lesson_id == lesson_id)
            .first()
        )
        if quiz is None:
            quiz = Quiz(lesson_id=lesson_id)
            db.add(quiz)

        quiz.title = data["title"]
        quiz.description = data["description"]
        quiz.difficulty = data["difficulty"]
        quiz.passing_score_percent = data["passing_score_percent"]
        quiz.is_active = True

        # Replace questions (simple upsert: clear and re-add so edits to the
        # seed propagate on re-seed).
        quiz.questions = []
        for q_data in data["questions"]:
            question = QuizQuestion(
                question_text=q_data["question_text"],
                options=json.dumps(q_data["options"]),
                correct_answer_index=q_data["correct_answer_index"],
                explanation=q_data["explanation"],
                display_order=q_data["display_order"],
                points=1,
            )
            quiz.questions.append(question)

        count += 1

    db.commit()
    logger.info("Seeded %d quizzes.", count)
    return count


__all__ = ["QUIZ_SEED", "seed_quizzes"]
