"""Email delivery service — Forgot Password (Email OTP).

All outbound email lives here. The API/CRUD layers never touch ``smtplib``
directly; they call :func:`send_password_reset_otp`.

Configuration is read from environment variables (``SMTP_HOST``,
``SMTP_PORT``, ``SMTP_USERNAME``, ``SMTP_PASSWORD``, ``SMTP_FROM_EMAIL``,
``SMTP_USE_TLS``) — no third-party email provider SDK is required, so this
works with any standard SMTP provider (Gmail, SES, SendGrid's SMTP
relay, Mailtrap, etc.) simply by setting the env vars, with zero code
changes.

Graceful degradation (mirrors :mod:`app.services.tts_service`): when SMTP is
not configured (no ``SMTP_HOST``), the OTP is logged instead of emailed, so
the Forgot Password flow is fully testable in local development without
real credentials. This never surfaces to the caller as a failure — per the
security requirement, the API must never reveal whether an email was
actually delivered.
"""

from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@aspeaksphere.app")
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() != "false"


class EmailServiceError(Exception):
    """Raised when an email fails to send. Callers should treat this as
    best-effort — never let it block or reveal state through the API."""


def is_email_configured() -> bool:
    """Whether real SMTP delivery is configured (vs. the dev log fallback)."""
    return bool(SMTP_HOST)


def _send(to_email: str, subject: str, body: str) -> None:
    """Send a plain-text email, or log it if SMTP is not configured."""
    if not is_email_configured():
        logger.warning(
            "[DEV] SMTP not configured — email not sent. To: %s | Subject: %s\n%s",
            to_email,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        logger.warning("Failed to send email to %s: %s", to_email, exc)
        raise EmailServiceError("Could not send email.") from exc


def send_password_reset_otp(to_email: str, otp: str) -> None:
    """Send the password-reset OTP email.

    Best-effort: raises :class:`EmailServiceError` on failure so the caller
    can log it, but the caller must still return the generic "if an account
    exists" response regardless of outcome (never reveal delivery status).
    """
    subject = "Reset your ASpeakSphere password"
    body = (
        "Your password reset verification code is:\n\n"
        f"{otp}\n\n"
        "This OTP expires in 5 minutes.\n\n"
        "If you did not request a password reset, please ignore this email."
    )
    _send(to_email, subject, body)


def send_email_verification_otp(to_email: str, otp: str) -> None:
    """Send the email-verification OTP email (signup / unverified-login flow).

    Same best-effort contract as :func:`send_password_reset_otp` — internally
    reuses :func:`_send`; only the subject and body differ.
    """
    subject = "Verify your ASpeakSphere email"
    body = (
        "Your email verification code is:\n\n"
        f"{otp}\n\n"
        "This code expires in 5 minutes.\n\n"
        "If you did not create an ASpeakSphere account, please ignore this email."
    )
    _send(to_email, subject, body)


__all__ = [
    "EmailServiceError",
    "is_email_configured",
    "send_password_reset_otp",
    "send_email_verification_otp",
]
