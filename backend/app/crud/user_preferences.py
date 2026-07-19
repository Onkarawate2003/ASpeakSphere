"""CRUD operations for user onboarding preferences.

The temporary ``MOCK_USER_ID`` has been removed. Every function now requires
an explicit ``user_id`` which is supplied by the authenticated user resolved
in the API layer.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.user_preferences import UserPreferences
from app.schemas.user_preferences import UserPreferencesCreate, UserPreferencesUpdate


def get_user_preferences(db: Session, user_id: int) -> Optional[UserPreferences]:
    return db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()


def create_user_preferences(
    db: Session,
    preferences_in: UserPreferencesCreate,
    user_id: int,
) -> UserPreferences:
    preferences = UserPreferences(
        user_id=user_id,
        **preferences_in.model_dump(mode="json"),
    )
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences


def upsert_user_preferences(
    db: Session,
    preferences_in: UserPreferencesUpdate,
    user_id: int,
) -> UserPreferences:
    preferences = get_user_preferences(db=db, user_id=user_id)
    payload = preferences_in.model_dump(mode="json")

    if preferences is None:
        return create_user_preferences(
            db=db,
            preferences_in=UserPreferencesCreate(**payload),
            user_id=user_id,
        )

    for field, value in payload.items():
        setattr(preferences, field, value)

    preferences.onboarding_completed = True
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences
