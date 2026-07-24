"""Pydantic schemas for the translation endpoint.

AI Conversation Translation feature. A small, isolated addition living in
its own module — adding this feature never required touching
``app/schemas/speech.py`` or any other existing schema file.
"""

from pydantic import BaseModel, Field

# Extensible: add more target-language codes here as they're supported by
# app.services.translation_service.LANGUAGE_NAMES. The request/response
# shape already supports any future code without changing this schema.
SUPPORTED_TARGET_LANGUAGES: tuple[str, ...] = (
    "hi",
    "mr",
    "es",
    "fr",
    "de",
    "ja",
    "ko",
    "zh",
    "ar",
    "pt",
    "it",
)


class TranslateRequest(BaseModel):
    """Payload for ``POST /api/v1/translate``."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The English text to translate (an existing AI reply).",
    )
    target_language: str = Field(
        default="hi",
        description="Target language code. See SUPPORTED_TARGET_LANGUAGES for the current list.",
    )


class TranslateResponse(BaseModel):
    """Response for ``POST /api/v1/translate``."""

    translated_text: str = Field(..., description="The translated text.")
    target_language: str = Field(
        ..., description="The language code the text was translated into."
    )


__all__ = [
    "TranslateRequest",
    "TranslateResponse",
    "SUPPORTED_TARGET_LANGUAGES",
]
