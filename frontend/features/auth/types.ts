// Shared authentication types for the frontend.

export type AuthToken = string;

export type AuthUser = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    /**
     * Whether the user has finished onboarding. Returned by `GET /auth/me`
     * and used to route authenticated users: those who have not completed
     * onboarding are sent to `/onboarding` instead of `/dashboard`.
     */
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
};

export type RegisterPayload = {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
};

export type LoginPayload = {
    email: string;
    password: string;
};

export type TokenResponse = {
    access_token: AuthToken;
    token_type: string;
};

/**
 * Response for `POST /auth/register`. Never carries a token — a brand-new
 * account always starts unverified (see Email Verification below).
 */
export type RegisterResponse = {
    verification_required: boolean;
    email: string;
    message: string;
};

/**
 * Response for `POST /auth/login`. `access_token` is present only when the
 * account is already verified; otherwise `verification_required` is true
 * and the account is NOT logged in.
 */
export type LoginResponse = {
    access_token?: AuthToken;
    token_type?: string;
    verification_required: boolean;
    email?: string;
    message?: string;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
    status: AuthStatus;
    user: AuthUser | null;
    token: AuthToken | null;
    register: (payload: RegisterPayload) => Promise<AuthUser>;
    login: (payload: LoginPayload) => Promise<AuthUser>;
    verifyEmail: (payload: VerifyEmailPayload) => Promise<AuthUser>;
    loginWithGoogle: (idToken: string) => Promise<AuthUser>;
    logout: () => void;
    refreshUser: () => Promise<void>;
};

// ─── Google Authentication ──────────────────────────────────────────────

export type GoogleAuthPayload = {
    /** The Google ID Token obtained client-side via Google Identity Services. */
    id_token: string;
};

/**
 * Response for `POST /auth/google`. Always carries a token — a
 * Google-authenticated account is verified by construction (Google already
 * confirmed the email), so unlike email login there is no
 * `verification_required` branch.
 */
export type GoogleAuthResponse = {
    access_token: AuthToken;
    token_type: string;
    message: string;
};

// ─── Forgot Password (Email OTP) ────────────────────────────────────────────

export type ForgotPasswordPayload = {
    email: string;
};

/** Deliberately generic — never reveals whether the email is registered. */
export type ForgotPasswordResponse = {
    message: string;
};

export type VerifyResetOtpPayload = {
    email: string;
    otp: string;
};

export type VerifyResetOtpResponse = {
    /** Short-lived token authorizing the final reset-password call. */
    reset_token: string;
};

export type ResetPasswordPayload = {
    reset_token: string;
    new_password: string;
    confirm_password: string;
};

export type ResetPasswordResponse = {
    message: string;
};

// ─── Email Verification ─────────────────────────────────────────────────

export type VerifyEmailPayload = {
    email: string;
    otp: string;
};

export type VerifyEmailResponse = {
    access_token: AuthToken;
    token_type: string;
    message: string;
};

export type ResendVerificationPayload = {
    email: string;
};

export type VerificationStatusResponse = {
    is_email_verified: boolean;
};
