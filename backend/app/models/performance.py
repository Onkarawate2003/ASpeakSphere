"""SQLAlchemy model for the ``conversation_performance`` table.

Phase 1 — AI Conversation Summary Enhancement.
Stores the AI evaluation data (overall score, feedback, strengths, areas for
improvement, next recommendation) associated with a conversation. The table is
linked to the ``conversations`` table via a one-to-one relationship.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ConversationPerformance(Base):
    __tablename__ = "conversation_performance"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    overall_score = Column(Integer, nullable=True)
    coach_feedback = Column(Text, nullable=True)
    
    # Stored as newline-joined strings to match lesson_objectives pattern
    strengths = Column(Text, nullable=True)
    areas_for_improvement = Column(Text, nullable=True)
    
    next_recommendation = Column(String(200), nullable=True)
    
    # Flexible JSON storage for future practice-mode-specific metrics
    details = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Bidirectional relationship back to the conversation
    conversation = relationship("Conversation", back_populates="performance")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ConversationPerformance id={self.id} conversation_id={self.conversation_id} overall_score={self.overall_score}>"
