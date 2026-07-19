"""Pydantic schemas for conversation messages.

These models drive request/response validation for the message sub-routes of
``/api/conversations`` (``POST /{id}/messages`` and ``GET /{id}/messages``).

The ``MessageSender`` enum mirrors the frontend ``MessageRole`` union
(``"ai"`` / ``"user"``) defined in ``frontend/features/conversation/types.ts``.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MessageSender(str, Enum):
    """Who authored a message.

    Values match the frontend ``MessageRole`` union exactly.
    """

    ai = "ai"
    user = "user"


class MessageCreate(BaseModel):
    """Payload for ``POST /api/conversations/{id}/messages``.

    Only the message body is supplied by the client; the ``sender`` is
    inferred by the route handler (user messages come from the authenticated
    learner, AI messages are produced by the AI layer — not yet implemented).
    """

    message: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    """Public representation of a stored message."""

    id: int
    conversation_id: int
    sender: MessageSender
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


__all__ = ["MessageSender", "MessageCreate", "MessageResponse"]