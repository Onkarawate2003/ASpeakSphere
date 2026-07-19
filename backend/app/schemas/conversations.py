"""Pydantic schemas for the conversation endpoints.

These models drive request/response validation for the ``/api/conversations``
routes. They mirror the frontend ``PracticeType`` / ``ConversationStatus``
unions defined in ``frontend/features/conversation/types.ts`` so the values
stay in sync across the stack.

No AI processing happens here — these schemas only describe the shape of the
data persisted by the backend conversation architecture.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.messages import MessageResponse


class PracticeType(str, Enum):
    """The five practice modes that can launch a conversation session.

    Values match the frontend ``PracticeType`` union exactly.
    """

    speaking = "speaking"
    listening = "listening"
    vocabulary = "vocabulary"
    grammar = "grammar"
    pronunciation = "pronunciation"


class ConversationStatus(str, Enum):
    """Lifecycle of a conversation session.

    The backend persists ``active`` and ``ended``. ``idle`` is a frontend-only
    pre-session state and is intentionally excluded from the persisted values.
    """

    active = "active"
    ended = "ended"


class ConversationCreate(BaseModel):
    """Payload for ``POST /api/conversations``.

    Phase 9 — Lesson System: the optional ``lesson_*`` fields let the caller
    persist the selected lesson with the conversation so Emma can teach it
    and the history can display it. They are optional so pre-Phase-9 callers
    (and free-form sessions) keep working unchanged.
    """

    practice_type: PracticeType
    lesson_id: Optional[str] = Field(default=None, max_length=80)
    lesson_title: Optional[str] = Field(default=None, max_length=200)
    lesson_objectives: Optional[List[str]] = Field(default=None)


class ConversationUpdate(BaseModel):
    """Payload for ``PATCH /api/conversations/{id}``.

    All fields are optional so a caller can patch a subset (e.g. only update
    the status). Used by ``complete_conversation`` indirectly and by ad-hoc
    status transitions.
    """

    status: Optional[ConversationStatus] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = Field(default=None, ge=0)


def _objectives_from_text(raw: Optional[str]) -> Optional[List[str]]:
    """Split the stored newline-joined objectives blob into a list.

    Returns ``None`` when the column is empty so the JSON response omits the
    field entirely for pre-Phase-9 conversations (clean backward compat).
    """
    if raw is None:
        return None
    items = [line.strip() for line in raw.splitlines() if line.strip()]
    return items or None


class ConversationSummary(BaseModel):
    """Compact representation used in list responses.

    Omits the message bodies to keep list payloads small.
    """

    id: int
    practice_type: PracticeType
    status: ConversationStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    message_count: int = 0
    # Phase 9 — lesson info (nullable for pre-Phase-9 / free-form sessions).
    lesson_id: Optional[str] = None
    lesson_title: Optional[str] = None
    lesson_objectives: Optional[List[str]] = None
    # Phase 10.5 — XP awarded for completing this conversation (0 when the
    # conversation is still active or predates the XP system). Populated by the
    # API layer from the xp_awards ledger so the history surfaces can show
    # "XP earned" per session without duplicating the award logic.
    xp_earned: int = 0

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    """A single row in the paginated conversation list.

    Wraps :class:`ConversationSummary` with the owning ``user_id`` so the
    frontend can verify ownership client-side if needed.
    """

    id: int
    user_id: int
    practice_type: PracticeType
    status: ConversationStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    message_count: int = 0
    lesson_id: Optional[str] = None
    lesson_title: Optional[str] = None
    lesson_objectives: Optional[List[str]] = None
    # Phase 10.5 — XP awarded for completing this conversation (see
    # :class:`ConversationSummary`).
    xp_earned: int = 0

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Full representation of a single conversation (without messages)."""

    id: int
    user_id: int
    practice_type: PracticeType
    status: ConversationStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    created_at: datetime
    lesson_id: Optional[str] = None
    lesson_title: Optional[str] = None
    lesson_objectives: Optional[List[str]] = None

    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    """A conversation together with its messages.

    Returned by ``GET /api/conversations/{id}`` so the frontend can hydrate a
    full transcript in one request.
    """

    id: int
    user_id: int
    practice_type: PracticeType
    status: ConversationStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    created_at: datetime
    lesson_id: Optional[str] = None
    lesson_title: Optional[str] = None
    lesson_objectives: Optional[List[str]] = None
    # Phase 10.5 — XP awarded for completing this conversation (see
    # :class:`ConversationSummary`).
    xp_earned: int = 0
    messages: List[MessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


__all__ = [
    "PracticeType",
    "ConversationStatus",
    "ConversationCreate",
    "ConversationUpdate",
    "ConversationSummary",
    "ConversationListItem",
    "ConversationResponse",
    "ConversationDetail",
]