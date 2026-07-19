"""SQLAlchemy model for the ``conversation_messages`` table.

Each row is a single message exchanged within a conversation: either an AI
tutor utterance or a learner utterance. The ``sender`` column distinguishes
the two (``"ai"`` / ``"user"``), mirroring the frontend ``MessageRole`` union.

The model is named ``ConversationMessage`` (rather than ``Message``) to avoid
collisions with SQLAlchemy's internal ``Message`` class and to keep the
namespace explicit. The table name uses a pluralised, prefixed form for the
same reason.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Who authored the message: "ai" or "user". Stored as a string to match
    # the convention used elsewhere in the project (see user_preferences).
    sender = Column(String(8), nullable=False)

    # The message body. ``Text`` is used instead of ``String`` so long tutor
    # replies are not constrained by an arbitrary length.
    message = Column(Text, nullable=False)

    # When the message was recorded. Defaults to now() at insert time.
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Back-reference to the owning conversation (mirrors Conversation.messages).
    conversation = relationship("Conversation", back_populates="messages")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<ConversationMessage id={self.id} conversation_id={self.conversation_id} sender={self.sender!r}>"


__all__ = ["ConversationMessage"]