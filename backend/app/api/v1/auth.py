"""Authentication endpoints: register, login and current-user lookup.

All routes are mounted under ``/api/v1/auth`` (see ``main.py``).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import EmailStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.google_oauth import verify_google_id_token
from app.auth.jwt_handler import (
    create_access_token,
    create_reset_token,
    password_fingerprint,
    verify_reset_token,
)
from app.crud.users import (
    EmailAlreadyExistsError,
    InvalidOtpError,
    TooManyAttemptsError,
    authenticate_user,
    create_user,
    get_email_verification_status,
    get_or_create_google_user,
    get_user_by_id,
    request_email_verification_otp,
    request_password_reset_otp,
    reset_password_with_token,
    verify_email_otp,
    verify_reset_otp,
)
from app.database import get_db
from app.models.users import User
from app.schemas.users import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    GoogleAuthResponse,
    LoginResponse,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    VerificationStatusResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    VerifyResetOtpRequest,
    VerifyResetOtpResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> RegisterResponse:
    """Create a new user account and send an email-verification OTP.

    Does NOT log the user in — every new account starts unverified, so the
    frontend must redirect to ``/verify-email`` and complete authentication
    via ``POST /verify-email`` before continuing into onboarding.
    """
    try:
        user = create_user(db, user_in=user_in)
    except EmailAlreadyExistsError:
        # Duplicate email detected by the CRUD layer.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )
    except IntegrityError:
        # Defensive: race condition where two concurrent requests slipped past
        # the pre-check before the unique constraint fired.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    request_email_verification_otp(db, email=user.email)
    return RegisterResponse(email=user.email)


@router.post("/login", response_model=LoginResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)) -> LoginResponse:
    """Authenticate a user with email + password and return a JWT.

    An unverified account never receives a token: the response instead
    flags ``verification_required`` so the frontend can redirect to
    ``/verify-email`` and finish logging in there via ``POST /verify-email``.
    """
    user = authenticate_user(db, email=credentials.email, password=credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user.",
        )

    if not user.is_email_verified:
        return LoginResponse(
            verification_required=True,
            email=user.email,
            message="Please verify your email to continue.",
        )

    access_token = create_access_token(subject=user.id)
    return LoginResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """Return the profile of the authenticated user.

    The ``onboarding_completed`` flag (exposed via ``UserResponse``) is derived
    from the user's ``preferences`` relationship. We touch it here while the
    session is still open so the value is loaded into the identity map before
    Pydantic serializes the response.
    """
    # Force the one-to-one preferences relationship to load now; this makes
    # ``current_user.onboarding_completed`` resolve without a lazy load during
    # response serialization.
    _ = current_user.preferences
    return current_user


# --------------------------------------------------------------------- #
# Google Authentication
# --------------------------------------------------------------------- #


@router.post("/google", response_model=GoogleAuthResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> GoogleAuthResponse:
    """Sign in (or sign up) with a Google ID Token.

    Handles both Google Signup and Google Login with a single endpoint, per
    the Google Authentication spec: the token is verified with Google's own
    library (never parsed/validated by hand), then the matching user is
    looked up or created. A brand-new account is marked
    ``is_email_verified=True`` immediately — Google has already verified the
    address, so (unlike ``POST /register``) no OTP is ever sent — and the
    normal login access token is issued via the same
    ``create_access_token`` helper every other flow uses.
    """
    claims = verify_google_id_token(payload.id_token)
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google credential.",
        )

    email = claims.get("email")
    if not email or not claims.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is not verified.",
        )

    user = get_or_create_google_user(
        db,
        email=email,
        first_name=claims.get("given_name") or "Google",
        last_name=claims.get("family_name") or "User",
    )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user.",
        )

    access_token = create_access_token(subject=user.id)
    return GoogleAuthResponse(access_token=access_token)


# --------------------------------------------------------------------- #
# Email Verification
# --------------------------------------------------------------------- #


@router.post("/verify-email", response_model=VerifyEmailResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> VerifyEmailResponse:
    """Validate a submitted verification OTP and complete authentication.

    Reuses the same OTP validation logic as ``verify-reset-otp``. Unlike the
    password-reset flow there is no intermediate short-lived token: a
    successful verification issues the normal login access token directly,
    since verifying email *is* the last step of both Signup and an
    unverified Login attempt.
    """
    try:
        user = verify_email_otp(db, email=payload.email, otp=payload.otp)
    except TooManyAttemptsError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        ) from exc
    except InvalidOtpError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    access_token = create_access_token(subject=user.id)
    return VerifyEmailResponse(access_token=access_token)


@router.post("/resend-verification", response_model=ForgotPasswordResponse)
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Resend an email-verification OTP.

    Same generic-response security model as ``resend-reset-otp``: always
    returns the same message regardless of whether the email is registered,
    already verified, or currently within its resend cooldown.
    """
    request_email_verification_otp(db, email=payload.email)
    return ForgotPasswordResponse(
        message="If an account exists for this email, a verification code has been sent."
    )


@router.get("/verification-status", response_model=VerificationStatusResponse)
def verification_status(
    email: EmailStr = Query(...),
    db: Session = Depends(get_db),
) -> VerificationStatusResponse:
    """Whether ``email`` belongs to a verified account.

    Used by the ``/verify-email`` page to skip the OTP form when the account
    was already verified elsewhere (e.g. a second tab). Always 200 — see
    ``VerificationStatusResponse`` for why unknown emails report ``False``
    rather than 404.
    """
    return VerificationStatusResponse(
        is_email_verified=get_email_verification_status(db, email=email)
    )


# --------------------------------------------------------------------- #
# Forgot Password (Email OTP)
# --------------------------------------------------------------------- #


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Request a password-reset OTP by email.

    Always returns the same generic message, whether or not the email is
    registered, active, or currently within its resend cooldown — the
    response never reveals which case occurred (see the security
    requirements in the Forgot Password spec).
    """
    request_password_reset_otp(db, email=payload.email)
    return ForgotPasswordResponse()


@router.post("/resend-reset-otp", response_model=ForgotPasswordResponse)
def resend_reset_otp(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Resend a password-reset OTP (same logic and cooldown as forgot-password).

    A distinct endpoint for the frontend's "Resend OTP" button, but
    identical behaviour and the same generic response — a fresh OTP is
    only actually generated when the 60-second cooldown has elapsed.
    """
    request_password_reset_otp(db, email=payload.email)
    return ForgotPasswordResponse()


@router.post("/verify-reset-otp", response_model=VerifyResetOtpResponse)
def verify_reset_otp_endpoint(
    payload: VerifyResetOtpRequest,
    db: Session = Depends(get_db),
) -> VerifyResetOtpResponse:
    """Validate a submitted OTP and issue a short-lived password-reset token.

    The reset token (not the OTP) is what authorizes the final
    ``POST /reset-password`` call, so the OTP itself is never re-submitted.
    """
    try:
        user = verify_reset_otp(db, email=payload.email, otp=payload.otp)
    except TooManyAttemptsError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        ) from exc
    except InvalidOtpError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    reset_token = create_reset_token(user.id, user.password_hash)
    return VerifyResetOtpResponse(reset_token=reset_token)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> ResetPasswordResponse:
    """Set a new password using the reset token from ``verify-reset-otp``.

    Clears the OTP, its expiry, and the attempt counter on success (Pydantic
    already validated that ``new_password`` and ``confirm_password`` match
    and meet the existing password rules).
    """
    token_payload = verify_reset_token(payload.reset_token)
    session_expired = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Reset session expired. Please request a new OTP.",
    )
    if token_payload is None:
        raise session_expired

    user = get_user_by_id(db, user_id=token_payload.user_id)
    if user is None:
        raise session_expired

    # Single-use enforcement: the token's embedded fingerprint must still
    # match the user's CURRENT password hash. It only matches once — the
    # moment a reset succeeds the hash changes, so a replayed token (even
    # though still unexpired) can never be redeemed a second time.
    if password_fingerprint(user.password_hash) != token_payload.password_fingerprint:
        raise session_expired

    try:
        reset_password_with_token(
            db, user_id=token_payload.user_id, new_password=payload.new_password
        )
    except InvalidOtpError as exc:
        raise session_expired from exc

    return ResetPasswordResponse()
