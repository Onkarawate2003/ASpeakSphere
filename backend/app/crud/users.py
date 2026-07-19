"""CRUD operations for the ``users`` table.

All functions expect an open SQLAlchemy ``Session``. Password hashing is
performed here so callers never handle plain-text passwords.
"""

import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.auth.security import hash_password, verify_password
from app.models.users import User
from app.schemas.users import UserCreate
from app.services.email_service import (
    EmailServiceError,
    send_email_verification_otp,
    send_password_reset_otp,
)

logger = logging.getLogger(__name__)

# OTP security constants — shared by Forgot Password and Email Verification
# (both flows use identical hashing/expiry/attempt-limit/cooldown rules).
OTP_EXPIRE_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60


class EmailAlreadyExistsError(Exception):
    """Raised when registration is attempted with an email already in use."""


class InvalidOtpError(Exception):
    """Raised when a submitted OTP is wrong, missing, or expired."""


class TooManyAttemptsError(Exception):
    """Raised when the OTP has already been guessed wrong too many times."""


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new user with a bcrypt-hashed password.

    The account starts unverified (see Email Verification below) — the
    caller is responsible for issuing a verification OTP after creation.

    Raises:
        EmailAlreadyExistsError: If the email is already registered.
    """
    existing = get_user_by_email(db, email=user_in.email)
    if existing is not None:
        raise EmailAlreadyExistsError("A user with this email already exists.")

    user = User(
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        is_active=True,
        is_email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Return the user when credentials are valid, otherwise ``None``."""
    user = get_user_by_email(db, email=email)
    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


# --------------------------------------------------------------------- #
# Google Authentication
# --------------------------------------------------------------------- #


def get_or_create_google_user(
    db: Session, *, email: str, first_name: str, last_name: str
) -> User:
    """Return the user for ``email``, creating one if none exists yet.

    Mirrors ``create_user`` for the brand-new-account case, except the
    account starts fully verified (Google already confirmed the email, so
    no OTP is sent — see the Google Authentication spec) and is tagged
    ``auth_provider="google"``. ``password_hash`` still can't be NULL (the
    column is NOT NULL), so a random, never-shared value is stored; it can
    never be guessed or used to log in via the password flow.

    An existing account (regardless of how it was originally created) is
    returned as-is except that ``is_email_verified`` is raised to ``True``
    if it wasn't already — Google has just proven ownership of the address,
    so an email-signup account that never finished OTP verification is
    unblocked the same way a verified one already is.
    """
    user = get_user_by_email(db, email=email)
    if user is not None:
        if not user.is_email_verified:
            user.is_email_verified = True
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        is_active=True,
        is_email_verified=True,
        auth_provider="google",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --------------------------------------------------------------------- #
# Shared OTP engine — used by both Forgot Password (Email OTP) and Email
# Verification. The two flows are identical (generate a 6-digit code, store
# only its bcrypt hash, 5-minute expiry, 5-attempt lockout, 60-second resend
# cooldown) and differ only in *which* four columns on ``User`` hold the
# state, so that difference is captured once as an ``_OtpFields`` value
# rather than as two copies of the same logic.
# --------------------------------------------------------------------- #


@dataclass(frozen=True)
class _OtpFields:
    """Attribute names of the four OTP-state columns for a given flow."""

    hash: str
    expires_at: str
    attempts: str
    last_sent_at: str


_RESET_OTP_FIELDS = _OtpFields(
    hash="reset_otp_hash",
    expires_at="reset_otp_expires_at",
    attempts="reset_otp_attempts",
    last_sent_at="reset_otp_last_sent_at",
)

_EMAIL_VERIFICATION_OTP_FIELDS = _OtpFields(
    hash="email_verification_otp_hash",
    expires_at="email_verification_expires_at",
    attempts="email_verification_attempts",
    last_sent_at="email_verification_last_sent_at",
)


def _generate_otp() -> str:
    """Return a cryptographically secure random 6-digit OTP (zero-padded)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _issue_otp(db: Session, user: User, fields: _OtpFields) -> Optional[str]:
    """Generate and store a fresh OTP for ``user`` under ``fields``.

    Honors the 60-second resend cooldown: returns ``None`` (and stores
    nothing new) when the previous OTP for this flow was issued too
    recently. Otherwise stores a bcrypt hash of a new OTP (reusing the
    existing password-hashing primitives), a 5-minute expiry, resets the
    attempt counter, and returns the plain OTP for the caller to email.
    """
    now = datetime.now(timezone.utc)
    last_sent = getattr(user, fields.last_sent_at)
    if last_sent is not None:
        elapsed = (now - last_sent).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            return None

    otp = _generate_otp()
    setattr(user, fields.hash, hash_password(otp))
    setattr(user, fields.expires_at, now + timedelta(minutes=OTP_EXPIRE_MINUTES))
    setattr(user, fields.attempts, 0)
    setattr(user, fields.last_sent_at, now)
    db.add(user)
    db.commit()
    return otp


def _consume_otp(db: Session, user: User, otp: str, fields: _OtpFields) -> None:
    """Validate ``otp`` for ``user`` under ``fields``, raising on failure.

    Raises:
        InvalidOtpError: no OTP in progress, wrong code, or expired.
        TooManyAttemptsError: the 5-attempt limit has already been reached.

    On success, does nothing further — the caller applies whatever
    flow-specific effect success should have (clearing OTP state, marking
    the email verified, etc.).
    """
    otp_hash = getattr(user, fields.hash)
    expires_at = getattr(user, fields.expires_at)
    if not otp_hash or expires_at is None:
        raise InvalidOtpError("Invalid or expired OTP.")

    if getattr(user, fields.attempts) >= OTP_MAX_ATTEMPTS:
        raise TooManyAttemptsError("Too many attempts. Please request a new OTP.")

    if datetime.now(timezone.utc) > expires_at:
        raise InvalidOtpError("Invalid or expired OTP.")

    if not verify_password(otp, otp_hash):
        setattr(user, fields.attempts, getattr(user, fields.attempts) + 1)
        db.add(user)
        db.commit()
        raise InvalidOtpError("Invalid or expired OTP.")


def _clear_otp(user: User, fields: _OtpFields) -> None:
    """Reset all four OTP-state columns for ``fields`` (prevents replay)."""
    setattr(user, fields.hash, None)
    setattr(user, fields.expires_at, None)
    setattr(user, fields.attempts, 0)
    setattr(user, fields.last_sent_at, None)


# --------------------------------------------------------------------- #
# Forgot Password (Email OTP)
# --------------------------------------------------------------------- #


def request_password_reset_otp(db: Session, email: str) -> None:
    """Generate and email a fresh reset OTP for ``email`` (best-effort).

    Silently does nothing when no account exists for ``email`` or the
    60-second resend cooldown is still active — the router always returns
    the same generic message regardless, so none of this is ever revealed
    to the caller (see the Forgot Password security requirements).
    """
    user = get_user_by_email(db, email=email)
    if user is None or not user.is_active:
        return

    otp = _issue_otp(db, user, _RESET_OTP_FIELDS)
    if otp is None:
        return

    try:
        send_password_reset_otp(user.email, otp)
    except EmailServiceError:
        # Best-effort: the OTP is already stored, so a delivery failure
        # (or the dev-mode console fallback) never breaks the flow or
        # leaks anything back through the API response.
        logger.warning("Password reset OTP could not be emailed to user %s", user.id)


def verify_reset_otp(db: Session, email: str, otp: str) -> User:
    """Validate ``otp`` for ``email`` and return the user on success.

    Raises:
        InvalidOtpError: no reset in progress, wrong code, or expired.
        TooManyAttemptsError: the 5-attempt limit has already been reached
            (the caller must request a new OTP before trying again).
    """
    user = get_user_by_email(db, email=email)
    if user is None:
        raise InvalidOtpError("Invalid or expired OTP.")

    _consume_otp(db, user, otp, _RESET_OTP_FIELDS)
    return user


def reset_password_with_token(db: Session, user_id: int, new_password: str) -> User:
    """Set a new password for ``user_id`` and clear all reset OTP state.

    Raises:
        InvalidOtpError: the user no longer exists (defensive; should not
            happen for a validly-signed reset token).
    """
    user = get_user_by_id(db, user_id=user_id)
    if user is None:
        raise InvalidOtpError("Invalid or expired OTP.")

    user.password_hash = hash_password(new_password)
    _clear_otp(user, _RESET_OTP_FIELDS)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --------------------------------------------------------------------- #
# Email Verification
# --------------------------------------------------------------------- #


def request_email_verification_otp(db: Session, email: str) -> None:
    """Generate and email a fresh verification OTP for ``email`` (best-effort).

    Mirrors :func:`request_password_reset_otp` exactly (same silent no-ops
    for an unknown/inactive account or an active resend cooldown), plus one
    additional no-op case: an already-verified account has nothing to
    (re)send.
    """
    user = get_user_by_email(db, email=email)
    if user is None or not user.is_active or user.is_email_verified:
        return

    otp = _issue_otp(db, user, _EMAIL_VERIFICATION_OTP_FIELDS)
    if otp is None:
        return

    try:
        send_email_verification_otp(user.email, otp)
    except EmailServiceError:
        logger.warning("Email verification OTP could not be emailed to user %s", user.id)


def verify_email_otp(db: Session, email: str, otp: str) -> User:
    """Validate ``otp`` for ``email``, mark the account verified, and return it.

    Raises:
        InvalidOtpError: no verification in progress, wrong code, or expired.
        TooManyAttemptsError: the 5-attempt limit has already been reached
            (the caller must request a new OTP before trying again).

    On success the OTP state is cleared (prevents replay), matching
    ``reset_password_with_token``'s behaviour for the reset flow.
    """
    user = get_user_by_email(db, email=email)
    if user is None:
        raise InvalidOtpError("Invalid or expired OTP.")

    _consume_otp(db, user, otp, _EMAIL_VERIFICATION_OTP_FIELDS)

    user.is_email_verified = True
    _clear_otp(user, _EMAIL_VERIFICATION_OTP_FIELDS)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_email_verification_status(db: Session, email: str) -> bool:
    """Whether ``email`` belongs to a verified account.

    Returns ``False`` for unknown emails too, so this never becomes a
    stronger enumeration oracle than the existing Forgot Password endpoints
    (which never confirm or deny whether an email is registered either).
    """
    user = get_user_by_email(db, email=email)
    return bool(user and user.is_email_verified)


__all__ = [
    "EmailAlreadyExistsError",
    "InvalidOtpError",
    "TooManyAttemptsError",
    "get_user_by_id",
    "get_user_by_email",
    "create_user",
    "authenticate_user",
    "request_password_reset_otp",
    "verify_reset_otp",
    "reset_password_with_token",
    "request_email_verification_otp",
    "verify_email_otp",
    "get_email_verification_status",
    "get_or_create_google_user",
]
