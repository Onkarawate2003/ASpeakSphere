"""SQLAlchemy model for the ``daily_word_recommendations`` table.

Vocabulary Coach Phase 1.6 — Personalized Daily Word (Interest-Based).

Stores the single personalized daily word recommendation generated for a user
on a given calendar date (YYYY-MM-DD), caching it so simple page refreshes,
app re-openings, and navigation calls make ZERO extra AI requests.
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


class DailyWordRecommendation(Base):
    __tablename__ = "daily_word_recommendations"

    id = Column(Integer, primary_key=True, index=True)

    # Owner — FK to users.id. Cascade-deleted when the user is removed.
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Date string in YYYY-MM-DD format for fast indexing and daily rotation
    date = Column(String(10), nullable=False, index=True)

    # Personalization metadata used for recommendation
    topic = Column(String(100), nullable=False, default="")
    learning_goal = Column(String(100), nullable=False, default="")
    level = Column(String(50), nullable=False, default="")
    focus_area = Column(String(100), nullable=False, default="")
    preference_signature = Column(String(255), nullable=True, default="")

    # Recommended word details
    word = Column(String(255), nullable=False)
    pronunciation = Column(String(500), nullable=False, default="")
    part_of_speech = Column(String(100), nullable=False, default="")
    meaning = Column(Text, nullable=False, default="")
    example = Column(Text, nullable=False, default="")

    # JSON arrays for synonyms and antonyms
    synonyms = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    antonyms = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Unique constraint: a user gets at most one recommendation per day.
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_daily_word_user_date"),
    )

    user = relationship("User", back_populates="daily_word_recommendations")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<DailyWordRecommendation user_id={self.user_id} date={self.date!r} word={self.word!r}>"
