"""CRUD operations for the ``conversation_messages`` table.

All functions expect an open SQLAlchemy ``Session``. Messages are always
scoped to a specific ``conversation_id``; ownership of that conversation is
verified by the API layer before any of these functions are called.
"""

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.messages import ConversationMessage
from app.schemas.messages import MessageCreate, MessageSender


def get_message(db: Session, message_id: int) -> Optional[ConversationMessage]:
    """Return a single message by id, or ``None`` if not found."""
    return (
        db.query(ConversationMessage)
        .filter(ConversationMessage.id == message_id)
        .first()
    )


def get_messages(
    db: Session,
    conversation_id: int,
) -> List[ConversationMessage]:
    """Return all messages for a conversation, ordered chronologically."""
    return (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.id.asc())
        .all()
    )


def create_message(
    db: Session,
    message_in: MessageCreate,
    conversation_id: int,
    sender: MessageSender,
) -> ConversationMessage:
    """Append a message to a conversation.

    The ``sender`` is supplied by the route handler (``user`` for learner
    input, ``ai`` for tutor replies) rather than trusted from the client body.
    """
    message = ConversationMessage(
        conversation_id=conversation_id,
        sender=sender.value,
        message=message_in.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def delete_messages(db: Session, conversation_id: int) -> int:
    """Delete all messages belonging to a conversation.

    Returns the number of rows deleted. Used when a conversation is reset.
    """
    deleted = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


__all__ = [
    "get_message",
    "get_messages",
    "create_message",
    "delete_messages",
]