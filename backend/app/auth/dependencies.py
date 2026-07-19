"""FastAPI dependencies for authentication.

``get_current_user`` reads the ``Authorization: Bearer <token>`` header,
verifies the JWT and returns the matching ``User`` ORM object. It is the
single dependency used to protect every authenticated route.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.jwt_handler import decode_access_token
from app.crud.users import get_user_by_id
from app.database import get_db
from app.models.users import User

# tokenUrl is only used by FastAPI's OpenAPI docs; the real login endpoint
# lives at /api/v1/auth/login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from the bearer token.

    Raises:
        HTTPException 401: When the token is missing, invalid, expired or the
            user no longer exists / is deactivated.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except Exception:
        raise credentials_exception

    sub = payload.get("sub")
    if sub is None:
        raise credentials_exception

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise credentials_exception

    user = get_user_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Convenience dependency that mirrors ``get_current_user``.

    Kept for clarity in routes that explicitly want to express the
    "active user" requirement.
    """
    return current_user


__all__ = ["get_current_user", "get_current_active_user", "oauth2_scheme"]
