"""Pydantic schemas for user authentication.

These models drive request/response validation for the register, login and
``/me`` endpoints. Passwords are accepted on input but never returned.
"""

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator

# Reasonable email pattern used as a secondary guard alongside EmailStr so we
# can surface a clear validation message for malformed addresses.
_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class UserCreate(BaseModel):
    """Payload for ``POST /api/v1/auth/register``."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("first_name")
    @classmethod
    def _normalize_first_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("First name is required.")
        return cleaned

    @field_validator("last_name")
    @classmethod
    def _normalize_last_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Last name is required.")
        return cleaned

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return value


class UserLogin(BaseModel):
    """Payload for ``POST /api/v1/auth/login``."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """Public representation of a user (no password hash)."""

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    is_active: bool
    # Whether the user has finished onboarding. Drives frontend routing:
    # authenticated users who have not completed onboarding are sent to
    # /onboarding instead of /dashboard.
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT access token response."""

    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    """Response for ``POST /api/v1/auth/register``.

    No access token: a brand-new account always starts unverified, so the
    frontend must redirect to ``/verify-email`` and complete authentication
    via ``POST /verify-email`` instead of being logged in immediately.
    """

    verification_required: bool = True
    email: EmailStr
    message: str = "Account created. Please verify your email to continue."


class LoginResponse(BaseModel):
    """Response for ``POST /api/v1/auth/login``.

    ``access_token`` is present only when the credentials are valid AND the
    account is already verified. Otherwise ``verification_required`` is
    ``True`` and the frontend redirects to ``/verify-email`` instead of
    entering the app — the account is not logged in.
    """

    access_token: Optional[str] = None
    token_type: str = "bearer"
    verification_required: bool = False
    email: Optional[EmailStr] = None
    message: Optional[str] = None


class TokenData(BaseModel):
    """Internal representation of the decoded JWT payload."""

    user_id: Optional[int] = None


class ProfileResponse(BaseModel):
    id: int
    firstName: str = Field(..., alias="first_name")
    lastName: str = Field(..., alias="last_name")
    email: str
    displayName: Optional[str] = None
    # Phase M13 — the learner's chosen English accent, sourced from
    # user_preferences.english_variant. Exposed on the profile so the
    # frontend can display the active accent and keep its UI in sync
    # without a separate request. ``None`` means no accent is set yet
    # (the backend services fall back to the default accent).
    englishAccent: Optional[str] = None

    class Config:
        populate_by_name = True
        from_attributes = True


class ProfileUpdate(BaseModel):
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)


# --------------------------------------------------------------------- #
# Forgot Password (Email OTP)
# --------------------------------------------------------------------- #

_OTP_PATTERN = re.compile(r"^\d{6}$")


class ForgotPasswordRequest(BaseModel):
    """Payload for ``POST /api/v1/auth/forgot-password`` and
    ``POST /api/v1/auth/resend-reset-otp`` (identical shape)."""

    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Generic response shared by forgot-password and resend-otp.

    Deliberately uninformative about whether the email is registered —
    see the security requirements in the Forgot Password spec.
    """

    message: str = "If an account exists for this email, an OTP has been sent."


class VerifyResetOtpRequest(BaseModel):
    """Payload for ``POST /api/v1/auth/verify-reset-otp``."""

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

    @field_validator("otp")
    @classmethod
    def _validate_otp(cls, value: str) -> str:
        if not _OTP_PATTERN.match(value):
            raise ValueError("OTP must be exactly 6 digits.")
        return value


class VerifyResetOtpResponse(BaseModel):
    """Short-lived reset token used to authorize the final password reset."""

    reset_token: str


class ResetPasswordRequest(BaseModel):
    """Payload for ``POST /api/v1/auth/reset-password``."""

    reset_token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _validate_new_password(cls, value: str) -> str:
        # Mirrors UserCreate's password rule so reset passwords are held to
        # the same standard as registration passwords.
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return value

    @field_validator("confirm_password")
    @classmethod
    def _validate_passwords_match(cls, value: str, info: ValidationInfo) -> str:
        new_password = info.data.get("new_password")
        if new_password is not None and value != new_password:
            raise ValueError("Passwords do not match.")
        return value


class ResetPasswordResponse(BaseModel):
    message: str = "Password changed successfully."


# --------------------------------------------------------------------- #
# Email Verification
# --------------------------------------------------------------------- #

# Reuses ``ForgotPasswordRequest``'s identical ``{email}`` shape rather than
# duplicating it — the resend-verification payload has no extra fields.
ResendVerificationRequest = ForgotPasswordRequest


class VerifyEmailRequest(VerifyResetOtpRequest):
    """Payload for ``POST /api/v1/auth/verify-email``.

    Same ``{email, otp}`` shape and OTP-format validation as
    ``VerifyResetOtpRequest`` — subclassed rather than duplicated.
    """


class VerifyEmailResponse(BaseModel):
    """Issued once the OTP is confirmed — this *is* the login token, since a
    successful verification always completes authentication (whether the
    user arrived here from Signup or from an unverified Login attempt)."""

    access_token: str
    token_type: str = "bearer"
    message: str = "Email verified successfully."


# --------------------------------------------------------------------- #
# Google Authentication
# --------------------------------------------------------------------- #


class GoogleAuthRequest(BaseModel):
    """Payload for ``POST /api/v1/auth/google``.

    ``id_token`` is the Google ID Token obtained client-side via Google
    Identity Services — never a password or authorization code.
    """

    id_token: str = Field(..., min_length=1)


class GoogleAuthResponse(BaseModel):
    """Issued once the Google ID Token is verified — this *is* the login
    token, whether the account already existed or was just created (a
    Google-authenticated account is always email-verified, so there is no
    intermediate step like the email/password flow's ``verification_required``)."""

    access_token: str
    token_type: str = "bearer"
    message: str = "Signed in with Google successfully."


class VerificationStatusResponse(BaseModel):
    """Response for ``GET /api/v1/auth/verification-status``.

    Always 200; an unknown email reports ``is_email_verified: False`` rather
    than 404, consistent with the Forgot Password convention of never
    confirming or denying whether an email is registered.
    """

    is_email_verified: bool


__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "Token",
    "TokenData",
    "RegisterResponse",
    "LoginResponse",
    "ProfileResponse",
    "ProfileUpdate",
    "ForgotPasswordRequest",
    "ForgotPasswordResponse",
    "VerifyResetOtpRequest",
    "VerifyResetOtpResponse",
    "ResetPasswordRequest",
    "ResetPasswordResponse",
    "ResendVerificationRequest",
    "VerifyEmailRequest",
    "VerifyEmailResponse",
    "VerificationStatusResponse",
    "GoogleAuthRequest",
    "GoogleAuthResponse",
]
