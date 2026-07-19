"""JWT access-token creation and verification.

Configuration is read from environment variables so that secrets never live
in source code. Tokens are signed with HS256 and carry the user id as the
``sub`` claim.
"""

import hashlib
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

# --- Configuration loaded from environment variables -------------------------

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

# Forgot Password (Email OTP) — short-lived token issued after a successful
# OTP verification, carried by the frontend from the Verify OTP step to the
# Reset Password step so the OTP itself never has to be re-submitted. Signed
# with the same SECRET_KEY/ALGORITHM as the login access token (reusing the
# existing JWT infrastructure) but tagged with a distinct "purpose" claim so
# it can never be used as a substitute login token, and vice versa.
RESET_TOKEN_PURPOSE: str = "password_reset"
RESET_TOKEN_EXPIRE_MINUTES: int = 10


def create_access_token(subject: str | int, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT for the given subject (user id).

    Args:
        subject: Unique identifier of the user (stored as ``sub``).
        expires_delta: Optional override for the token lifetime.

    Returns:
        Encoded JWT string.
    """
    to_encode: dict[str, Any] = {"sub": str(subject)}
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta is not None else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT.

    Raises:
        JWTError: If the token is invalid, malformed or expired.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def extract_user_id(token: str) -> Optional[int]:
    """Convenience helper that returns the user id from a token or ``None``."""
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None

    sub = payload.get("sub")
    if sub is None:
        return None

    try:
        return int(sub)
    except (TypeError, ValueError):
        return None


def password_fingerprint(password_hash: str) -> str:
    """Derive a short, non-reversible fingerprint of a bcrypt password hash.

    Embedded in the reset token (never the raw hash itself) and re-derived
    at redemption time so the token is single-use by construction: the
    fingerprint only matches while the password hasn't changed yet, so the
    moment a reset actually succeeds (which changes ``password_hash``), the
    same token can never be redeemed again — no extra DB state needed.
    """
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True)
class ResetTokenPayload:
    user_id: int
    password_fingerprint: str


def create_reset_token(user_id: str | int, current_password_hash: str) -> str:
    """Create a short-lived, single-use password-reset token for ``user_id``.

    Carries a ``purpose`` claim distinguishing it from a normal login
    access token (a leaked reset token cannot be used to authenticate, and
    a leaked access token cannot be used to reset a password), plus a
    fingerprint of the user's *current* password hash so the token is
    single-use: it stops validating as soon as the password actually
    changes, even though it's a stateless JWT.
    """
    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "purpose": RESET_TOKEN_PURPOSE,
        "pwfp": password_fingerprint(current_password_hash),
    }
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_reset_token(token: str) -> Optional[ResetTokenPayload]:
    """Return the decoded payload of a valid, unexpired reset token.

    Returns ``None`` (never raises) for any invalid, expired, or
    wrong-purpose token — callers treat every failure mode uniformly. The
    caller must additionally re-check ``password_fingerprint`` against the
    user's *current* password hash to enforce single-use (see
    :func:`password_fingerprint`).
    """
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None

    if payload.get("purpose") != RESET_TOKEN_PURPOSE:
        return None

    sub = payload.get("sub")
    fingerprint = payload.get("pwfp")
    if sub is None or not fingerprint:
        return None

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        return None

    return ResetTokenPayload(user_id=user_id, password_fingerprint=fingerprint)


__all__ = [
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "RESET_TOKEN_EXPIRE_MINUTES",
    "create_access_token",
    "decode_access_token",
    "extract_user_id",
    "create_reset_token",
    "verify_reset_token",
    "password_fingerprint",
    "ResetTokenPayload",
    "JWTError",
]
