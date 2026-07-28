"""Pydantic schemas for Vocabulary Coach endpoints.

Phase 1.1: Invalid Word Detection.
Phase 1.5A: Save Word to Personal Vocabulary.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VocabularySearchRequest(BaseModel):
    """Payload for searching a vocabulary word."""
    word: str = Field(..., description="The English word to search for.")


class VocabularySearchResponse(BaseModel):
    """Structured response containing AI-generated vocabulary details.

    Phase 1.1 fields: is_valid_word, error_message.
    Phase 1 fields: word, pronunciation, part_of_speech, meaning, example.
    Forward-compatible optional fields: synonyms, antonyms, translations, notes.
    """
    is_valid_word: bool = Field(default=True, description="Whether the word is a valid English dictionary word.")
    error_message: Optional[str] = Field(default=None, description="Friendly error message if the word is invalid.")

    word: str = Field(default="", description="The queried English word.")
    pronunciation: str = Field(default="", description="IPA pronunciation string.")
    part_of_speech: str = Field(default="", description="Grammatical part of speech.")
    meaning: str = Field(default="", description="Definition of the word.")
    example: str = Field(default="", description="Example usage sentence.")

    # Forward-compatible fields
    synonyms: List[str] = Field(default_factory=list, description="List of synonyms.")
    antonyms: List[str] = Field(default_factory=list, description="List of antonyms.")
    translations: Dict[str, str] = Field(default_factory=dict, description="Translations dictionary.")
    notes: Dict[str, str] = Field(default_factory=dict, description="Additional notes.")


# ---------------------------------------------------------------------------
# Phase 1.5A — Save Word schemas
# ---------------------------------------------------------------------------

class SavedWordCreate(BaseModel):
    """Payload for saving a vocabulary word to the user's personal collection."""
    word: str = Field(..., description="The English word.")
    pronunciation: str = Field(default="", description="IPA pronunciation string.")
    part_of_speech: str = Field(default="", description="Grammatical part of speech.")
    meaning: str = Field(default="", description="Definition of the word.")
    example: str = Field(default="", description="Example usage sentence.")
    synonyms: List[str] = Field(default_factory=list, description="List of synonyms.")
    antonyms: List[str] = Field(default_factory=list, description="List of antonyms.")


class SavedWordResponse(BaseModel):
    """Response schema for a saved vocabulary word."""
    id: int
    user_id: int
    word: str
    pronunciation: str
    part_of_speech: str
    meaning: str
    example: str
    synonyms: List[str]
    antonyms: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SavedWordStatusResponse(BaseModel):
    """Response schema for checking whether a word is saved by the current user."""
    word: str
    is_saved: bool


# ---------------------------------------------------------------------------
# Phase 1.6 — Personalized Daily Word schemas
# ---------------------------------------------------------------------------

class PersonalizedDailyWordResponse(BaseModel):
    """Structured response for today's personalized daily word recommendation."""
    id: int
    user_id: int
    date: str = Field(..., description="Date string in YYYY-MM-DD format.")
    topic: str = Field(..., description="Topic of interest used for recommendation.")
    learning_goal: str = Field(..., description="Learning goal used for recommendation.")
    level: str = Field(..., description="Proficiency level used for recommendation.")
    focus_area: str = Field(..., description="Focus area used for recommendation.")
    word: str = Field(..., description="The recommended English word.")
    pronunciation: str = Field(..., description="IPA pronunciation string.")
    part_of_speech: str = Field(..., description="Grammatical part of speech.")
    meaning: str = Field(..., description="Clear definition.")
    example: str = Field(..., description="Natural example usage sentence.")
    synonyms: List[str] = Field(default_factory=list, description="Common synonyms.")
    antonyms: List[str] = Field(default_factory=list, description="Common antonyms.")
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Phase 1.7 — Vocabulary Quiz schemas
# ---------------------------------------------------------------------------

class QuizQuestionOption(BaseModel):
    id: str
    text: str


class QuizQuestion(BaseModel):
    id: str
    word: str
    question_type: str = Field(..., description="meaning_to_word | word_to_meaning | synonym_match | antonym_match")
    question_text: str
    options: List[QuizQuestionOption]
    correct_option_id: str
    explanation: str


class QuizGenerateResponse(BaseModel):
    quiz_id: str
    total_questions: int
    questions: List[QuizQuestion]
    source_summary: str = Field(..., description="Summary of word sources (e.g. Saved Words, Daily Word, AI)")


class QuizSubmissionItem(BaseModel):
    word: str
    question_type: str
    selected_option_id: str
    correct_option_id: str
    is_correct: bool


class QuizSubmissionRequest(BaseModel):
    questions: List[QuizSubmissionItem]


class QuizSubmissionResponse(BaseModel):
    score: int
    total_questions: int
    accuracy_percentage: float
    xp_earned: int
    mastered_count: int
    results: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Phase 1.8 — Vocabulary Progress & Mastery schemas
# ---------------------------------------------------------------------------

class VocabProgressResponse(BaseModel):
    total_saved_words: int
    mastered_words_count: int
    learning_words_count: int
    needs_revision_count: int
    total_quizzes_taken: int
    overall_accuracy_percentage: float
    strongest_words: List[str]
    weakest_words: List[str]
    recent_activity: List[Dict[str, Any]]


