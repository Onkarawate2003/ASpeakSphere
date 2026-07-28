"""SQLAlchemy model for the ``vocab_word_mastery`` table.

Vocabulary Coach Phase 1.8 — Progress & Mastery Tracking.

Stores word-level learning progress per user to calculate spaced repetition,
consecutive correct streaks, accuracy, and mastery statuses.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class VocabWordMastery(Base):
    __tablename__ = "vocab_word_mastery"

    id = Column(Integer, primary_key=True, index=True)

    # Owner — FK to users.id. Cascade-deleted when the user is removed.
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Word (lowercased)
    word = Column(String(255), nullable=False, index=True)

    # Mastery status: 'needs_revision' | 'learning' | 'mastered'
    mastery_status = Column(String(50), nullable=False, default="needs_revision")

    # Attempt statistics
    correct_attempts = Column(Integer, nullable=False, default=0)
    total_attempts = Column(Integer, nullable=False, default=0)
    consecutive_correct = Column(Integer, nullable=False, default=0)

    last_tested_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Unique constraint: one progress record per user per word.
    __table_args__ = (
        UniqueConstraint("user_id", "word", name="uq_vocab_word_mastery_user_word"),
    )

    user = relationship("User", back_populates="vocab_masteries")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<VocabWordMastery user_id={self.user_id} word={self.word!r} status={self.mastery_status!r}>"
