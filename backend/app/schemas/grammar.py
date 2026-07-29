"""Pydantic schemas for the Grammar Coach check endpoint."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class GrammarCheckRequest(BaseModel):
    """Request payload for checking one English sentence."""

    sentence: str = Field(..., min_length=1, max_length=1000, description="Sentence to check.")

    @field_validator("sentence")
    @classmethod
    def validate_sentence(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Sentence must be text.")
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Sentence must not be empty.")
        if not any(character.isalpha() for character in cleaned):
            raise ValueError("Sentence must contain at least one letter.")
        return cleaned


class GrammarCorrection(BaseModel):
    """One grammar correction."""

    incorrect: str
    correct: str
    rule: str
    reason: str
    severity: Literal["low", "medium", "high"]


class GrammarCheckResponse(BaseModel):
    """Grammar feedback returned to the client."""

    grammar_score: int = Field(..., ge=0, le=100)
    original_sentence: str
    corrected_sentence: str
    tone: str
    overall_feedback: str
    corrections: list[GrammarCorrection]


__all__ = ["GrammarCheckRequest", "GrammarCorrection", "GrammarCheckResponse"]
