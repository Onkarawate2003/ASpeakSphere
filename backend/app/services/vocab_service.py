"""Vocabulary Coach service layer.

Phase 1.2: Synonyms & Antonyms support.

Reuses the existing shared AI infrastructure (Groq client, GROQ_MODEL,
AIServiceError, timeout, error mapping) from :mod:`app.services.ai_service`.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from groq import APIConnectionError, APIStatusError, APITimeoutError, RateLimitError

from app.schemas.vocabulary import VocabularySearchResponse
from app.services.ai_service import AIServiceError, GROQ_MODEL, get_groq_client

logger = logging.getLogger(__name__)


def _sanitize_words_list(raw_list: Any, query_word: str) -> List[str]:
    """Helper to deduplicate, strip, lowercase, and filter out the queried word."""
    if not isinstance(raw_list, list):
        return []
    target = query_word.strip().lower()
    seen = set()
    cleaned = []
    for item in raw_list:
        if isinstance(item, str):
            item_clean = item.strip().lower()
            if item_clean and item_clean != target and item_clean not in seen:
                seen.add(item_clean)
                cleaned.append(item_clean)
    return cleaned


def search_word(word: str) -> VocabularySearchResponse:
    """Lookup vocabulary details for ``word`` using the shared AI service.

    Phase 1.2: Evaluates dictionary validity, returning structured JSON with
    word details, pronunciation, part of speech, meaning, example sentence,
    3-6 common synonyms, and 2-5 common antonyms (if applicable).

    Args:
        word: The English word entered by the user.

    Returns:
        VocabularySearchResponse containing validation status, word details,
        synonyms, and antonyms.

    Raises:
        AIServiceError: On empty input, invalid key, rate limit, timeout, or
            malformed AI response.
    """
    cleaned_word = (word or "").strip()
    if not cleaned_word:
        raise AIServiceError("Please enter an English word.", status_code=400)

    system_prompt = (
        "You are an expert English lexicographer and vocabulary coach. Your task is to evaluate "
        "if the input string is a valid standard English dictionary word, and return structured JSON.\n\n"
        "STRICT VALIDATION RULES:\n"
        "1. First determine if the input is a genuine, standard English dictionary word.\n"
        "2. NEVER invent or fabricate meanings, pronunciations, examples, synonyms, or antonyms for invalid words "
        "or random gibberish (e.g., 'asdfghjkl', 'qwertyzzzzz', 'xyzabc123').\n"
        "3. If you are uncertain whether the input is a real English word, classify it as invalid instead of guessing.\n\n"
        "JSON OUTPUT RULES:\n"
        "Return ONLY a strict JSON object with exact keys:\n"
        '{"is_valid_word": boolean, "error_message": string, "word": string, "pronunciation": string, "part_of_speech": string, "meaning": string, "example": string, "synonyms": string[], "antonyms": string[]}\n\n'
        "IF INVALID (is_valid_word = false):\n"
        '- "is_valid_word": false\n'
        '- "error_message": "The entered word is not a recognised English dictionary word."\n'
        '- "word": "", "pronunciation": "", "part_of_speech": "", "meaning": "", "example": ""\n'
        '- "synonyms": [], "antonyms": []\n\n'
        "IF VALID (is_valid_word = true):\n"
        '- "is_valid_word": true\n'
        '- "error_message": ""\n'
        '- "word": the formatted word in Title Case or standard spelling\n'
        '- "pronunciation": IPA representation, e.g. /ˈbjuːtɪfəl/\n'
        '- "part_of_speech": grammatical category, e.g. Noun, Verb, Adjective, Adverb\n'
        '- "meaning": clear, concise English definition\n'
        '- "example": a clear, natural example sentence\n'
        '- "synonyms": array of 3–6 common, natural synonyms ordered from most common to least common. Avoid obscure/technical terms. Do not include the queried word itself.\n'
        '- "antonyms": array of 2–5 common antonyms whenever applicable. If the word naturally has no antonyms (e.g. computer, table), return an empty array []. Never invent antonyms.\n\n'
        "Respond strictly with valid raw JSON. Do NOT wrap in markdown code blocks (no ```json)."
    )

    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Evaluate and analyze the word: '{cleaned_word}'"},
            ],
            temperature=0.1,
            max_tokens=400,
        )
    except AIServiceError:
        raise
    except RateLimitError as exc:
        logger.warning("Groq rate limit exceeded in Vocabulary Coach: %s", exc)
        raise AIServiceError(
            "The vocabulary service is busy right now. Please wait a moment and try again.",
            status_code=429,
        ) from exc
    except APITimeoutError as exc:
        logger.warning("Groq request timed out in Vocabulary Coach: %s", exc)
        raise AIServiceError(
            "The request timed out while fetching word details. Please try again.",
            status_code=504,
        ) from exc
    except APIConnectionError as exc:
        logger.error("Could not connect to Groq in Vocabulary Coach: %s", exc)
        raise AIServiceError(
            "Could not reach the vocabulary service. Please check your connection and try again.",
            status_code=503,
        ) from exc
    except APIStatusError as exc:
        status_code = getattr(exc, "status_code", None)
        logger.error("Groq API error in Vocabulary Coach (status %s): %s", status_code, exc)
        raise AIServiceError(
            "The AI service encountered an error while processing the word. Please try again.",
            status_code=502,
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in Vocabulary Coach: %s", exc)
        raise AIServiceError(
            "An unexpected error occurred while searching for the word.",
            status_code=500,
        ) from exc

    # Parse JSON output
    try:
        content = completion.choices[0].message.content or ""
    except (AttributeError, IndexError) as exc:
        logger.error("Malformed Groq response in Vocabulary Coach: %r", completion)
        raise AIServiceError(
            "Received an unexpected response format from the AI service.",
            status_code=502,
        ) from exc

    raw_json = content.strip()
    if raw_json.startswith("```"):
        raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json, flags=re.IGNORECASE)
        raw_json = re.sub(r"\s*```$", "", raw_json)

    try:
        data: Dict[str, Any] = json.loads(raw_json)
    except Exception as exc:
        logger.error("Failed to parse JSON output from Groq: %r", raw_json)
        raise AIServiceError(
            "Could not parse vocabulary information for this word. Please try another word.",
            status_code=502,
        ) from exc

    is_valid = bool(data.get("is_valid_word", True))

    if not is_valid:
        error_msg = str(data.get("error_message") or "The entered word is not a recognised English dictionary word.").strip()
        return VocabularySearchResponse(
            is_valid_word=False,
            error_message=error_msg,
            word="",
            pronunciation="",
            part_of_speech="",
            meaning="",
            example="",
            synonyms=[],
            antonyms=[],
            translations={},
            notes={},
        )

    # Validate required fields for valid words
    required_keys = ["word", "pronunciation", "part_of_speech", "meaning", "example"]
    for key in required_keys:
        if not data.get(key):
            logger.error("Missing key '%s' in valid Vocabulary Coach AI output: %r", key, data)
            raise AIServiceError(
                "Incomplete vocabulary data received. Please try again.",
                status_code=502,
            )

    synonyms = _sanitize_words_list(data.get("synonyms"), cleaned_word)
    antonyms = _sanitize_words_list(data.get("antonyms"), cleaned_word)

    return VocabularySearchResponse(
        is_valid_word=True,
        error_message="",
        word=str(data["word"]).strip(),
        pronunciation=str(data["pronunciation"]).strip(),
        part_of_speech=str(data["part_of_speech"]).strip(),
        meaning=str(data["meaning"]).strip(),
        example=str(data["example"]).strip(),
        synonyms=synonyms,
        antonyms=antonyms,
        translations=data.get("translations") if isinstance(data.get("translations"), dict) else {},
        notes=data.get("notes") if isinstance(data.get("notes"), dict) else {},
    )


# ---------------------------------------------------------------------------
# Phase 1.6 — Personalized Daily Word (Interest-Based)
# ---------------------------------------------------------------------------

def _compute_preference_signature(prefs: Any) -> str:
    """Compute a deterministic signature string representing vocabulary personalization settings.

    Format: learning_goal|sorted(topics)|sorted(focus_areas)|proficiency_level
    Example: "career|health,technology|grammar,vocabulary|beginner"
    Excludes unrelated preferences (notifications, reminders, accents, etc.).
    """
    if not prefs:
        return "daily_life|||intermediate"
    raw_goal = getattr(prefs.learning_goal, "value", prefs.learning_goal) if hasattr(prefs, "learning_goal") else "daily_life"
    raw_level = getattr(prefs.proficiency_level, "value", prefs.proficiency_level) if hasattr(prefs, "proficiency_level") else "intermediate"
    goal_str = str(raw_goal or "daily_life").strip().lower()
    level_str = str(raw_level or "intermediate").strip().lower()

    topics = getattr(prefs, "topics", []) or []
    topics_str = ",".join(sorted([str(t).strip().lower() for t in topics if t]))

    focus = getattr(prefs, "focus_areas", []) or []
    focus_str = ",".join(sorted([str(f).strip().lower() for f in focus if f]))

    return f"{goal_str}|{topics_str}|{focus_str}|{level_str}"


def get_or_generate_daily_word(db: Any, user_id: int) -> DailyWordRecommendation:
    """Get or generate today's personalized daily word recommendation for the user.

    Uses a 1-day database cache (`daily_word_recommendations` table) so that page
    refreshes, app re-openings, and navigation make ZERO extra AI requests.

    If the user updates their onboarding preferences (Learning Goal, Topics, Level, Focus Areas),
    the preference signature changes, automatically invalidating today's cached row and
    regenerating today's recommendation using the updated preferences.

    Personalization priority order:
      1. Learning Goal (e.g. career, travel, education, daily_life)
      2. Topics of Interest (e.g. technology, news, health, entertainment)
      3. English Proficiency Level (e.g. beginner, intermediate, advanced)
      4. Focus Areas (e.g. vocabulary, pronunciation, grammar, fluency)
    """
    from datetime import datetime, timezone
    from app.crud.user_preferences import get_user_preferences
    from app.models.daily_word import DailyWordRecommendation

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Fetch user preferences and compute current preference signature
    prefs = get_user_preferences(db=db, user_id=user_id)
    current_signature = _compute_preference_signature(prefs)

    # 2. Check today's cached recommendation
    cached = (
        db.query(DailyWordRecommendation)
        .filter(
            DailyWordRecommendation.user_id == user_id,
            DailyWordRecommendation.date == today_str,
        )
        .first()
    )

    # If cached recommendation exists AND preference signature matches: return cached!
    if cached and getattr(cached, "preference_signature", None) == current_signature:
        return cached  # type: ignore[return-value]

    # 3. Preferences changed or no cached row exists -> Generate fresh recommendation
    learning_goal = prefs.learning_goal.value if (prefs and hasattr(prefs.learning_goal, "value")) else (getattr(prefs, "learning_goal", "daily_life") or "daily_life")
    proficiency_level = prefs.proficiency_level.value if (prefs and hasattr(prefs.proficiency_level, "value")) else (getattr(prefs, "proficiency_level", "intermediate") or "intermediate")
    topics = getattr(prefs, "topics", []) or []
    focus_areas = getattr(prefs, "focus_areas", []) or []

    # Daily topic rotation: rotate through the learner's selected topics based on day of year
    if topics:
        day_of_year = datetime.now(timezone.utc).timetuple().tm_yday
        chosen_topic_raw = topics[day_of_year % len(topics)]
        primary_topic = str(chosen_topic_raw).replace("_", " ").capitalize()
    else:
        primary_topic = "General Conversation"

    primary_focus = str(focus_areas[0]).replace("_", " ").capitalize() if focus_areas else "Vocabulary"
    learning_goal_str = str(learning_goal).replace("_", " ").capitalize()
    level_str = str(proficiency_level).replace("_", " ").capitalize()

    system_prompt = (
        "You are an expert English vocabulary coach. Generate ONE personalized daily English word recommendation "
        "tailored precisely to the learner's topics of interest, background, goals, and level.\n\n"
        "STRICT PERSONALIZATION PRIORITY:\n"
        f"1. Priority 1 (HIGHEST): Topic of Interest = {primary_topic}\n"
        f"2. Priority 2: Learning Goal = {learning_goal_str}\n"
        f"3. Priority 3: English Proficiency Level = {level_str}\n"
        f"4. Priority 4: Focus Area = {primary_focus}\n\n"
        "CRITICAL TOPIC MANDATE:\n"
        f"- The recommended word MUST strictly belong to the '{primary_topic}' domain.\n"
        f"- Do NOT recommend a word from the '{learning_goal_str}' domain unless it is ALSO directly a '{primary_topic}' word.\n"
        f"- For example: If Topic is 'Health' and Goal is 'Travel', the word MUST be health-related (e.g. doctor, vaccine, nutrition, clinic, diagnosis, wellness), NOT travel-related (e.g. passport, luggage, itinerary).\n"
        f"- For example: If Topic is 'Technology' and Goal is 'Career', the word MUST be technology-related (e.g. algorithm, software, database, encryption).\n"
        f"- For example: If Topic is 'Sports' and Goal is 'Education', the word MUST be sports-related (e.g. athlete, tournament, endurance, coach).\n\n"
        "STRICT LEVEL RULES:\n"
        "- Beginner / Elementary (A1-A2): Only simple everyday vocabulary. Never use obscure or complex academic terms.\n"
        "- Intermediate / Upper Intermediate (B1-B2): Practical, moderately challenging vocabulary.\n"
        "- Advanced (C1-C2): Sophisticated, nuanced, and rich vocabulary.\n\n"
        "JSON OUTPUT RULES:\n"
        "Return ONLY a strict JSON object with exact keys:\n"
        '{"word": string, "pronunciation": string, "part_of_speech": string, "meaning": string, "example": string, "synonyms": string[], "antonyms": string[]}\n'
        'CRITICAL: All JSON string values, including IPA pronunciation, MUST be wrapped in double quotes. Example: "pronunciation": "/ˈbjuːtɪfəl/" (never unquoted /.../).\n\n'
        "FORMATTING:\n"
        '- "word": Title Case or standard spelling\n'
        '- "pronunciation": IPA string, e.g. /ˈbjuːtɪfəl/\n'
        '- "part_of_speech": Noun, Verb, Adjective, Adverb, etc.\n'
        '- "meaning": Clear, concise English definition suitable for the learner level\n'
        '- "example": Natural, authentic example sentence applying the word in a practical context\n'
        '- "synonyms": Array of 3–5 common synonyms\n'
        '- "antonyms": Array of 2–4 common antonyms (or [] if naturally inapplicable)\n\n'
        "Respond strictly with valid raw JSON. Do NOT wrap in markdown code blocks (no ```json)."
    )

    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Recommend 1 {primary_topic}-related daily word for a {level_str} level learner "
                        f"with a goal of {learning_goal_str} focusing on {primary_focus}."
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=400,
        )
    except AIServiceError:
        raise
    except Exception as exc:
        logger.exception("Failed to generate personalized daily word: %s", exc)
        raise AIServiceError("Could not generate today's recommendation. Please try again.", status_code=500) from exc

    try:
        content = completion.choices[0].message.content or ""
        raw_json = content.strip()
        if raw_json.startswith("```"):
            raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json, flags=re.IGNORECASE)
            raw_json = re.sub(r"\s*```$", "", raw_json)
        # Fix unquoted IPA slashes e.g. "pronunciation": /.../ -> "pronunciation": "/.../"
        raw_json = re.sub(r':\s*/([^/\n]+)/\s*([,}])', r': "/\1/"\2', raw_json)
        data: Dict[str, Any] = json.loads(raw_json)
    except Exception as exc:
        logger.error("Failed to parse daily word JSON output: %r", content)
        raise AIServiceError("Could not parse daily recommendation. Please try again.", status_code=502) from exc

    raw_word = str(data.get("word", "")).strip()
    synonyms = _sanitize_words_list(data.get("synonyms"), raw_word)
    antonyms = _sanitize_words_list(data.get("antonyms"), raw_word)

    # 4. Overwrite existing cached row if signature changed, or insert new row
    if cached:
        cached.topic = primary_topic
        cached.learning_goal = learning_goal_str
        cached.level = level_str
        cached.focus_area = primary_focus
        cached.preference_signature = current_signature
        cached.word = raw_word
        cached.pronunciation = str(data.get("pronunciation", "")).strip()
        cached.part_of_speech = str(data.get("part_of_speech", "")).strip()
        cached.meaning = str(data.get("meaning", "")).strip()
        cached.example = str(data.get("example", "")).strip()
        cached.synonyms = synonyms
        cached.antonyms = antonyms
        db.add(cached)
        db.commit()
        db.refresh(cached)
        return cached  # type: ignore[return-value]

    recommendation = DailyWordRecommendation(
        user_id=user_id,
        date=today_str,
        topic=primary_topic,
        learning_goal=learning_goal_str,
        level=level_str,
        focus_area=primary_focus,
        preference_signature=current_signature,
        word=raw_word,
        pronunciation=str(data.get("pronunciation", "")).strip(),
        part_of_speech=str(data.get("part_of_speech", "")).strip(),
        meaning=str(data.get("meaning", "")).strip(),
        example=str(data.get("example", "")).strip(),
        synonyms=synonyms,
        antonyms=antonyms,
    )

    db.add(recommendation)
    try:
        db.commit()
        db.refresh(recommendation)
    except Exception:
        db.rollback()
        existing = (
            db.query(DailyWordRecommendation)
            .filter(
                DailyWordRecommendation.user_id == user_id,
                DailyWordRecommendation.date == today_str,
            )
            .first()
        )
        if existing:
            return existing  # type: ignore[return-value]
        raise

    return recommendation


