"""Vocabulary Quiz Generator & Mastery Service Layer.

Phase 1.7 — Vocabulary Quiz.
Phase 1.8 — Vocabulary Progress & Mastery Dashboard.
"""

import json
import logging
import random
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.crud.progress import award_xp, get_or_create_progress
from app.crud.user_preferences import get_user_preferences
from app.models.daily_word import DailyWordRecommendation
from app.models.saved_vocabulary import SavedWord
from app.models.vocab_mastery import VocabWordMastery
from app.schemas.vocabulary import (
    QuizGenerateResponse,
    QuizQuestion,
    QuizQuestionOption,
    QuizSubmissionItem,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    VocabProgressResponse,
)
from app.services.ai_service import AIServiceError, GROQ_MODEL, get_groq_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Phase B: Quiz Generator Logic
# ---------------------------------------------------------------------------

def generate_vocab_quiz(db: Session, user_id: int, requested_count: int = 5) -> QuizGenerateResponse:
    """Generate a dynamic MCQ quiz for the user.

    Generation Priority:
      1. Saved Words (`SavedWord` table)
      2. Daily Word Recommendations (`DailyWordRecommendation` table)
      3. Groq AI fallback (based on user onboarding preferences) if still < requested_count
    """
    requested_count = max(3, min(10, requested_count))

    # 1. Fetch user's saved words
    saved_entries = (
        db.query(SavedWord)
        .filter(SavedWord.user_id == user_id)
        .order_by(SavedWord.created_at.desc())
        .all()
    )

    words_pool: List[Dict[str, Any]] = []
    seen_words = set()

    for item in saved_entries:
        w_clean = item.word.strip().lower()
        if w_clean not in seen_words:
            seen_words.add(w_clean)
            words_pool.append({
                "word": item.word,
                "pronunciation": item.pronunciation,
                "part_of_speech": item.part_of_speech,
                "meaning": item.meaning,
                "example": item.example,
                "synonyms": item.synonyms or [],
                "antonyms": item.antonyms or [],
                "source": "saved_words",
            })

    saved_words_count = len(words_pool)

    # 2. Supplement from DailyWordRecommendation if needed
    if len(words_pool) < requested_count:
        daily_entries = (
            db.query(DailyWordRecommendation)
            .filter(DailyWordRecommendation.user_id == user_id)
            .order_by(DailyWordRecommendation.created_at.desc())
            .all()
        )
        for item in daily_entries:
            w_clean = item.word.strip().lower()
            if w_clean not in seen_words:
                seen_words.add(w_clean)
                words_pool.append({
                    "word": item.word,
                    "pronunciation": item.pronunciation,
                    "part_of_speech": item.part_of_speech,
                    "meaning": item.meaning,
                    "example": item.example,
                    "synonyms": item.synonyms or [],
                    "antonyms": item.antonyms or [],
                    "source": "daily_word",
                })
                if len(words_pool) >= requested_count:
                    break

    # 3. Supplement using Groq AI if still < requested_count
    if len(words_pool) < requested_count:
        needed = requested_count - len(words_pool)
        prefs = get_user_preferences(db=db, user_id=user_id)
        topic = prefs.topics[0] if (prefs and prefs.topics) else "General Conversation"
        level = prefs.proficiency_level.value if (prefs and hasattr(prefs.proficiency_level, "value")) else "intermediate"

        try:
            ai_words = _generate_supplemental_ai_words(topic=topic, level=level, count=needed)
            for item in ai_words:
                w_clean = str(item.get("word", "")).strip().lower()
                if w_clean and w_clean not in seen_words:
                    seen_words.add(w_clean)
                    words_pool.append({
                        "word": str(item.get("word", "")).strip(),
                        "pronunciation": str(item.get("pronunciation", "")).strip(),
                        "part_of_speech": str(item.get("part_of_speech", "")).strip(),
                        "meaning": str(item.get("meaning", "")).strip(),
                        "example": str(item.get("example", "")).strip(),
                        "synonyms": item.get("synonyms") if isinstance(item.get("synonyms"), list) else [],
                        "antonyms": item.get("antonyms") if isinstance(item.get("antonyms"), list) else [],
                        "source": "ai_generated",
                    })
        except Exception as exc:
            logger.warning("Could not generate supplemental AI words for quiz: %s", exc)

    if not words_pool:
        raise AIServiceError("No vocabulary words available for quiz. Please save words or try again.", status_code=400)

    # 4. Build Questions
    selected_pool = words_pool[:requested_count]
    questions: List[QuizQuestion] = []
    question_types = ["meaning_to_word", "word_to_meaning", "synonym_match", "antonym_match"]

    # Gather distractor words & definitions from pool
    all_words_list = [w["word"] for w in words_pool]
    all_meanings_list = [w["meaning"] for w in words_pool]

    for idx, item in enumerate(selected_pool):
        q_type = question_types[idx % len(question_types)]
        
        # Fallback q_types if synonyms/antonyms missing
        if q_type == "synonym_match" and not item["synonyms"]:
            q_type = "word_to_meaning"
        elif q_type == "antonym_match" and not item["antonyms"]:
            q_type = "meaning_to_word"

        q_id = f"q_{idx + 1}_{uuid.uuid4().hex[:6]}"

        if q_type == "meaning_to_word":
            question_text = f"Which word matches this definition?\n\u201C{item['meaning']}\u201D"
            correct_text = item["word"]
            # Distractors: other words
            distractors = [w for w in all_words_list if w.lower() != item["word"].lower()]
            while len(distractors) < 3:
                distractors.append(f"Option {len(distractors) + 1}")
            chosen_distractors = random.sample(distractors, 3)
            explanation = f"'{item['word']}' means: {item['meaning']}."

        elif q_type == "word_to_meaning":
            question_text = f"What is the definition of '{item['word']}' ({item['part_of_speech']})?"
            correct_text = item["meaning"]
            distractors = [m for m in all_meanings_list if m != item["meaning"]]
            fallback_distractor_pool = [
                "To communicate clearly in writing",
                "To move forward rapidly in a specified direction",
                "A state of complete balance and harmony",
                "To inspect closely for errors or defects",
            ]
            for fb in fallback_distractor_pool:
                if fb not in distractors and fb != item["meaning"]:
                    distractors.append(fb)
            chosen_distractors = random.sample(distractors, min(3, len(distractors)))
            explanation = f"'{item['word']}' means: {item['meaning']}."

        elif q_type == "synonym_match":
            correct_text = item["synonyms"][0]
            question_text = f"Which of the following is a synonym for '{item['word']}'?"
            distractors = [w for w in all_words_list if w.lower() != item["word"].lower() and w.lower() != correct_text.lower()]
            fallback_distractors = ["unrelated", "distinct", "alternate", "opposite"]
            for fb in fallback_distractors:
                if len(distractors) < 3:
                    distractors.append(fb)
            chosen_distractors = random.sample(distractors, 3)
            explanation = f"Synonyms of '{item['word']}' include: {', '.join(item['synonyms'])}."

        else:  # antonym_match
            correct_text = item["antonyms"][0]
            question_text = f"Which of the following is an antonym for '{item['word']}'?"
            distractors = [w for w in all_words_list if w.lower() != item["word"].lower() and w.lower() != correct_text.lower()]
            fallback_distractors = ["similar", "identical", "matching", "equivalent"]
            for fb in fallback_distractors:
                if len(distractors) < 3:
                    distractors.append(fb)
            chosen_distractors = random.sample(distractors, 3)
            explanation = f"Antonyms of '{item['word']}' include: {', '.join(item['antonyms'])}."

        # Assemble options & shuffle
        raw_options = [correct_text] + chosen_distractors
        random.shuffle(raw_options)

        option_objs: List[QuizQuestionOption] = []
        correct_opt_id = ""

        for opt_idx, opt_str in enumerate(raw_options):
            opt_id = f"opt_{opt_idx + 1}"
            option_objs.append(QuizQuestionOption(id=opt_id, text=opt_str))
            if opt_str == correct_text:
                correct_opt_id = opt_id

        questions.append(
            QuizQuestion(
                id=q_id,
                word=item["word"],
                question_type=q_type,
                question_text=question_text,
                options=option_objs,
                correct_option_id=correct_opt_id,
                explanation=explanation,
            )
        )

    summary_source = f"Generated from {saved_words_count} saved words"
    if saved_words_count < requested_count:
        summary_source += f" and supplemented with personalized daily/AI vocabulary"

    return QuizGenerateResponse(
        quiz_id=f"quiz_{uuid.uuid4().hex[:8]}",
        total_questions=len(questions),
        questions=questions,
        source_summary=summary_source,
    )


def _generate_supplemental_ai_words(topic: str, level: str, count: int) -> List[Dict[str, Any]]:
    """Helper to fetch supplemental vocabulary words via Groq AI if user has few saved words."""
    client = get_groq_client()
    prompt = (
        f"Generate {count} common, level-appropriate English vocabulary words for a {level} learner "
        f"interested in {topic}.\n"
        "Return ONLY a raw JSON array of objects: "
        '[{"word": string, "pronunciation": string, "part_of_speech": string, "meaning": string, "example": string, "synonyms": string[], "antonyms": string[]}]\n'
        "Do NOT wrap in markdown."
    )
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=500,
    )
    content = completion.choices[0].message.content or ""
    raw_json = content.strip()
    if raw_json.startswith("```"):
        raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json, flags=re.IGNORECASE)
        raw_json = re.sub(r"\s*```$", "", raw_json)
    return json.loads(raw_json)


# ---------------------------------------------------------------------------
# Phase A: Submission & Mastery Calculations
# ---------------------------------------------------------------------------

def submit_vocab_quiz(
    db: Session, user_id: int, payload: QuizSubmissionRequest
) -> QuizSubmissionResponse:
    """Process a quiz submission, update word mastery, and award XP."""
    if not payload.questions:
        raise AIServiceError("Quiz submission cannot be empty.", status_code=400)

    total_questions = len(payload.questions)
    correct_count = sum(1 for q in payload.questions if q.is_correct)
    accuracy_pct = round((correct_count / total_questions) * 100, 1)

    # Calculate XP: 10 XP per correct question + 20 bonus for 100% accuracy
    xp_earned = (correct_count * 10) + (20 if accuracy_pct == 100.0 else 0)

    results_detail: List[Dict[str, Any]] = []
    now_dt = datetime.now(timezone.utc)

    for item in payload.questions:
        clean_word = item.word.strip().lower()

        # Fetch or create VocabWordMastery entry
        mastery = (
            db.query(VocabWordMastery)
            .filter(
                VocabWordMastery.user_id == user_id,
                VocabWordMastery.word == clean_word,
            )
            .first()
        )
        if not mastery:
            mastery = VocabWordMastery(
                user_id=user_id,
                word=clean_word,
                mastery_status="needs_revision",
                correct_attempts=0,
                total_attempts=0,
                consecutive_correct=0,
            )
            db.add(mastery)

        # Update counters
        mastery.total_attempts += 1
        mastery.last_tested_at = now_dt

        if item.is_correct:
            mastery.correct_attempts += 1
            mastery.consecutive_correct += 1
        else:
            mastery.consecutive_correct = 0

        # Calculate mastery status
        word_accuracy = (mastery.correct_attempts / mastery.total_attempts) * 100.0
        if mastery.consecutive_correct >= 3 or (word_accuracy >= 85.0 and mastery.total_attempts >= 4):
            mastery.mastery_status = "mastered"
        elif word_accuracy >= 50.0 or (mastery.consecutive_correct >= 1 and mastery.mastery_status != "mastered"):
            mastery.mastery_status = "learning"
        else:
            mastery.mastery_status = "needs_revision"

        results_detail.append({
            "word": item.word,
            "question_type": item.question_type,
            "is_correct": item.is_correct,
            "new_mastery_status": mastery.mastery_status,
        })

    # Award XP idempotently via award_xp helper
    submission_ref = f"vocab_quiz_{uuid.uuid4().hex[:8]}"
    if xp_earned > 0:
        award_xp(
            db=db,
            user_id=user_id,
            source="vocab_quiz",
            reference=submission_ref,
            amount=xp_earned,
            reason=f"Completed Vocabulary Quiz ({correct_count}/{total_questions} correct)",
        )

    db.commit()

    # Count total mastered words for user
    mastered_count = (
        db.query(VocabWordMastery)
        .filter(
            VocabWordMastery.user_id == user_id,
            VocabWordMastery.mastery_status == "mastered",
        )
        .count()
    )

    return QuizSubmissionResponse(
        score=correct_count,
        total_questions=total_questions,
        accuracy_percentage=accuracy_pct,
        xp_earned=xp_earned,
        mastered_count=mastered_count,
        results=results_detail,
    )


# ---------------------------------------------------------------------------
# Phase A / D: Progress & Mastery Dashboard
# ---------------------------------------------------------------------------

def get_vocab_progress(db: Session, user_id: int) -> VocabProgressResponse:
    """Return vocabulary progress metrics, mastery breakdown, and strongest/weakest words."""
    total_saved = (
        db.query(SavedWord)
        .filter(SavedWord.user_id == user_id)
        .count()
    )

    mastery_rows = (
        db.query(VocabWordMastery)
        .filter(VocabWordMastery.user_id == user_id)
        .all()
    )

    mastered_count = sum(1 for m in mastery_rows if m.mastery_status == "mastered")
    learning_count = sum(1 for m in mastery_rows if m.mastery_status == "learning")
    needs_revision_count = sum(1 for m in mastery_rows if m.mastery_status == "needs_revision")

    # If saved words exist that haven't been tested yet, count them as needs_revision
    untested_count = max(0, total_saved - len(mastery_rows))
    needs_revision_count += untested_count

    total_attempts_sum = sum(m.total_attempts for m in mastery_rows)
    correct_attempts_sum = sum(m.correct_attempts for m in mastery_rows)
    overall_accuracy = (
        round((correct_attempts_sum / total_attempts_sum) * 100, 1)
        if total_attempts_sum > 0
        else 0.0
    )

    # Strongest words (highest consecutive correct)
    strongest = sorted(
        [m for m in mastery_rows if m.consecutive_correct > 0],
        key=lambda x: (x.consecutive_correct, x.correct_attempts),
        reverse=True,
    )
    strongest_words = [m.word.capitalize() for m in strongest[:5]]

    # Weakest words (lowest accuracy or needs_revision)
    weakest = sorted(
        [m for m in mastery_rows if m.total_attempts > 0],
        key=lambda x: (x.correct_attempts / x.total_attempts if x.total_attempts else 0, -x.total_attempts),
    )
    weakest_words = [m.word.capitalize() for m in weakest[:5]]

    # Recent activity
    recent_rows = sorted(mastery_rows, key=lambda x: x.last_tested_at, reverse=True)[:5]
    recent_activity = [
        {
            "word": m.word.capitalize(),
            "status": m.mastery_status,
            "accuracy": round((m.correct_attempts / m.total_attempts) * 100, 1) if m.total_attempts else 0,
            "last_tested": m.last_tested_at.isoformat() if m.last_tested_at else None,
        }
        for m in recent_rows
    ]

    # Total quizzes estimated from attempts / avg 5 questions per quiz
    total_quizzes = max(1 if total_attempts_sum > 0 else 0, round(total_attempts_sum / 5))

    return VocabProgressResponse(
        total_saved_words=total_saved,
        mastered_words_count=mastered_count,
        learning_words_count=learning_count,
        needs_revision_count=needs_revision_count,
        total_quizzes_taken=total_quizzes,
        overall_accuracy_percentage=overall_accuracy,
        strongest_words=strongest_words,
        weakest_words=weakest_words,
        recent_activity=recent_activity,
    )
