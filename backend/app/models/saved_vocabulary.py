"""SQLAlchemy model for the ``saved_vocabulary`` table.

Vocabulary Coach Phase 1.5A — Save Word to Personal Vocabulary.

Each row represents one English word saved by one user.
The (user_id, word) unique constraint prevents duplicates.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text

from app.database import Base


class SavedWord(Base):
    __tablename__ = "saved_vocabulary"

    id = Column(Integer, primary_key=True, index=True)

    # Owner — FK to users.id. Cascade-deleted when the user is removed.
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core vocabulary fields (all non-nullable; stored at save-time)
    word = Column(String(255), nullable=False, index=True)
    pronunciation = Column(String(500), nullable=False, default="")
    part_of_speech = Column(String(100), nullable=False, default="")
    meaning = Column(Text, nullable=False, default="")
    example = Column(Text, nullable=False, default="")

    # Optional array fields — stored as JSONB arrays.
    synonyms = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    antonyms = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Unique constraint: a user cannot save the same word twice.
    __table_args__ = (
        UniqueConstraint("user_id", "word", name="uq_saved_vocabulary_user_word"),
    )

    # Relationship back to the owning user (no cascade needed here;
    # cascade is defined on the FK's ondelete="CASCADE" above).
    user = relationship("User", back_populates="saved_words")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<SavedWord user_id={self.user_id} word={self.word!r}>"
