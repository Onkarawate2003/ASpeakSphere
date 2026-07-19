"""SQLAlchemy model for the ``users`` table.

A user owns one :class:`UserPreferences` row (created during onboarding) and
many :class:`Conversation` rows (one per AI practice session). Passwords are
stored exclusively as bcrypt hashes in ``password_hash``.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    # Forgot Password (Email OTP) — a bcrypt hash of the current one-time
    # password, never the plain code. Nullable: absent whenever no reset is
    # in progress (cleared on successful reset, overwritten on each new
    # request). Mirrors the password_hash convention (hash_password /
    # verify_password from app.auth.security) rather than a separate scheme.
    reset_otp_hash = Column(String(255), nullable=True)
    # When the current OTP stops being acceptable (issued_at + 5 minutes).
    reset_otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Failed verification attempts against the current OTP. Reset to 0 every
    # time a new OTP is issued; verification is refused once this reaches 5.
    reset_otp_attempts = Column(Integer, nullable=False, default=0)
    # When the last OTP was sent — enforces the 60-second resend cooldown.
    reset_otp_last_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Email Verification — mirrors the Forgot Password OTP columns above
    # exactly (same hashing/expiry/attempt-limit/cooldown model), just for a
    # separate flow: a brand-new account cannot log in until this is set.
    # Defaults to False at the ORM level for every account created through
    # the app (see create_user); pre-existing rows are backfilled to True by
    # the migration (see ensure_is_email_verified_column) so this feature
    # never locks out users who registered before it existed.
    is_email_verified = Column(Boolean, nullable=False, default=False)
    email_verification_otp_hash = Column(String(255), nullable=True)
    email_verification_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_verification_attempts = Column(Integer, nullable=False, default=0)
    email_verification_last_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Google Authentication — which flow created this account. "email" for
    # the existing password signup flow, "google" for accounts created via
    # "Continue with Google" (see get_or_create_google_user). Purely
    # informational: it never gates login, since a Google-created account has
    # no usable password and an email-created account can still be reached
    # via Google login if the addresses match.
    auth_provider = Column(String(20), nullable=False, default="email")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # One-to-one: a user has at most one onboarding preferences row.
    preferences = relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # One-to-many: a user owns every AI practice conversation they start.
    # Deleting a user cascades to their conversations (and, transitively, to
    # the messages within each conversation).
    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Phase 10 — one-to-one progress summary row. ``uselist=False`` makes it
    # a scalar attribute. Created lazily on first XP award / progress fetch.
    progress = relationship(
        "UserProgress",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Phase 11 — one-to-many: a user owns every quiz attempt they submit.
    # Deleting a user cascades to their quiz attempts.
    quiz_attempts = relationship(
        "QuizAttempt",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def onboarding_completed(self) -> bool:
        """Whether the user has finished onboarding.

        Onboarding is considered complete once a ``UserPreferences`` row
        exists for the user (it is created by ``POST /onboarding/preferences``
        with ``onboarding_completed=True``). A user with no preferences row
        has not completed onboarding.
        """
        return self.preferences is not None

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User id={self.id} email={self.email!r}>"
