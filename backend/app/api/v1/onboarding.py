"""Onboarding endpoints.

Both routes are now protected: the authenticated user (resolved from the JWT)
owns the preferences that are read or written. The previous ``MOCK_USER_ID``
constant has been removed entirely.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.crud.user_preferences import get_user_preferences, upsert_user_preferences
from app.database import get_db
from app.models.users import User
from app.schemas.user_preferences import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/preferences", response_model=UserPreferencesResponse)
def read_onboarding_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = get_user_preferences(db=db, user_id=current_user.id)
    if preferences is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Onboarding preferences have not been created yet.",
        )
    return preferences


@router.post("/preferences", response_model=UserPreferencesResponse, status_code=status.HTTP_200_OK)
def complete_onboarding(
    preferences_in: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return upsert_user_preferences(
        db=db,
        preferences_in=preferences_in,
        user_id=current_user.id,
    )
