from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_preferences_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Back-reference to the owning user (mirrors User.preferences).
    user = relationship("User", back_populates="preferences")
    display_name = Column(String(40), nullable=True)
    learning_goal = Column(String(40), nullable=False)
    proficiency_level = Column(String(40), nullable=False)
    level_confidence = Column(Boolean, nullable=False, default=True)
    daily_goal_minutes = Column(Integer, nullable=False)
    goal_tier = Column(String(24), nullable=False)
    topics = Column(ARRAY(String), nullable=False, default=list)
    focus_areas = Column(ARRAY(String), nullable=False, default=list)
    english_variant = Column(String(24), nullable=True)
    notifications_enabled = Column(Boolean, nullable=False, default=False)
    reminder_time = Column(String(5), nullable=True)
    reminder_frequency = Column(String(24), nullable=True)
    channels = Column(ARRAY(String), nullable=False, default=list)
    onboarding_completed = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
