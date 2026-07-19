from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class LearningGoal(str, Enum):
    career = "career"
    education = "education"
    travel = "travel"
    daily_life = "daily_life"
    exam_prep = "exam_prep"
    social_confidence = "social_confidence"
    relocation = "relocation"


class ProficiencyLevel(str, Enum):
    beginner = "beginner"
    elementary = "elementary"
    intermediate = "intermediate"
    upper_intermediate = "upper_intermediate"
    advanced = "advanced"


class GoalTier(str, Enum):
    casual = "casual"
    regular = "regular"
    serious = "serious"
    intense = "intense"


class EnglishVariant(str, Enum):
    us = "us"
    uk = "uk"
    australian = "australian"
    neutral = "neutral"


class ReminderFrequency(str, Enum):
    daily = "daily"
    weekdays = "weekdays"
    custom = "custom"


class NotificationChannel(str, Enum):
    push = "push"
    email = "email"


class UserPreferencesBase(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=40)
    learning_goal: LearningGoal
    proficiency_level: ProficiencyLevel
    level_confidence: bool = True
    daily_goal_minutes: Literal[5, 10, 15, 20]
    goal_tier: GoalTier
    topics: List[str] = Field(default_factory=list)
    focus_areas: List[str] = Field(default_factory=list)
    english_variant: Optional[EnglishVariant] = None
    notifications_enabled: bool = False
    reminder_time: Optional[str] = Field(default=None, pattern=r"^([01]\\d|2[0-3]):[0-5]\\d$")
    reminder_frequency: Optional[ReminderFrequency] = None
    channels: List[NotificationChannel] = Field(default_factory=list)


class UserPreferencesCreate(UserPreferencesBase):
    pass


class UserPreferencesUpdate(UserPreferencesBase):
    pass


class UserPreferencesResponse(UserPreferencesBase):
    id: int
    user_id: int
    onboarding_completed: bool

    class Config:
        from_attributes = True
