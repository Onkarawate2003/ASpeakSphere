from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PerformanceResponse(BaseModel):
    id: int

    conversation_id: int

    overall_score: int

    grammar: dict[str, Any] | None = None

    fluency: dict[str, Any] | None = None

    vocabulary: dict[str, Any] | None = None

    pronunciation: dict[str, Any] | None = None

    listening: dict[str, Any] | None = None

    coach_feedback: str | None = None

    next_recommendation: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True