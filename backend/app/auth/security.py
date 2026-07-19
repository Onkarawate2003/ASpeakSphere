"""Password hashing utilities built on the ``bcrypt`` library.

Plain-text passwords are never stored. ``hash_password`` is used at
registration time and ``verify_password`` is used at login time.

This module talks to the ``bcrypt`` library directly rather than going
through ``passlib``. passlib 1.7.4 is unmaintained and fails to initialise
its bcrypt backend against bcrypt >= 4.1 (it raises ``ValueError`` from an
internal self-test), which broke registration. Using ``bcrypt`` directly
keeps the same public API while remaining compatible across versions.

bcrypt only considers the first 72 bytes of a password; we enforce that
limit explicitly before hashing so long passwords do not raise.
"""

import bcrypt

# bcrypt truncates the password material to 72 bytes.
_BCRYPT_MAX_BYTES = 72


def _encode(password: str) -> bytes:
    """Encode a password to UTF-8 bytes, truncated to bcrypt's 72-byte limit."""
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """Return a bcrypt hash for the given plain-text password."""
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time comparison of a plain-text password against a hash.

    Returns ``False`` (never raises) when the stored hash is malformed, so
    callers can treat any non-matching result uniformly.
    """
    try:
        return bcrypt.checkpw(_encode(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        # ``hashed_password`` was malformed / not a valid bcrypt hash.
        return False
