// API client for authentication endpoints.
//
// Exposes `register`, `login`, `fetchCurrentUser` and a reusable
// `authedFetch` helper that attaches the bearer token to requests.

import { clearToken, getToken, setToken } from "./auth";
import type {
    AuthUser,
    ForgotPasswordPayload,
    ForgotPasswordResponse,
    GoogleAuthPayload,
    GoogleAuthResponse,
    LoginPayload,
    LoginResponse,
    RegisterPayload,
    RegisterResponse,
    ResendVerificationPayload,
    ResetPasswordPayload,
    ResetPasswordResponse,
    VerificationStatusResponse,
    VerifyEmailPayload,
    VerifyEmailResponse,
    VerifyResetOtpPayload,
    VerifyResetOtpResponse,
} from "./types";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
    status: number;
    detail: string;

    constructor(status: number, detail: string) {
        super(detail || "Request failed.");
        this.name = "ApiError";
        this.status = status;
        this.detail = detail;
    }
}

async function parseError(response: Response): Promise<never> {
    let detail = "Something went wrong. Please try again.";

    try {
        const data = await response.json();
        if (typeof data?.detail === "string") {
            detail = data.detail;
        } else if (Array.isArray(data?.detail)) {
            // Pydantic validation errors arrive as a list of objects.
            detail = data.detail
                .map((item: { msg?: string }) => item.msg)
                .filter(Boolean)
                .join(", ");
        }
    } catch {
        // Response was not JSON; fall back to the status text.
        if (response.statusText) {
            detail = response.statusText;
        }
    }

    throw new ApiError(response.status, detail);
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
    console.log("NEXT_PUBLIC_API_BASE_URL =", process.env.NEXT_PUBLIC_API_BASE_URL);
    console.log("API_BASE_URL =", API_BASE_URL);
    console.log("Request URL =", `${API_BASE_URL}${path}`);

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        await parseError(response);
    }

    return (await response.json()) as TResponse;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
    return postJson<RegisterResponse>("/auth/register", payload);
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
    return postJson<LoginResponse>("/auth/login", payload);
}

/**
 * Thrown by `AuthContext.login`/`.register` when the account exists and the
 * credentials (or new signup) are valid, but the account isn't verified yet
 * — the caller should route to `/verify-email` with `email` rather than
 * treating this as a normal `ApiError`.
 */
export class EmailNotVerifiedError extends Error {
    email: string;

    constructor(email: string) {
        super("Email verification required.");
        this.name = "EmailNotVerifiedError";
        this.email = email;
    }
}

// ─── Google Authentication ──────────────────────────────────────────────────

/** Exchanges a Google ID Token for an access token (handles both signup and login). */
export async function googleAuth(payload: GoogleAuthPayload): Promise<GoogleAuthResponse> {
    return postJson<GoogleAuthResponse>("/auth/google", payload);
}

// ─── Email Verification ────────────────────────────────────────────────────

export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
    return postJson<VerifyEmailResponse>("/auth/verify-email", payload);
}

export async function resendVerification(
    payload: ResendVerificationPayload,
): Promise<ForgotPasswordResponse> {
    return postJson<ForgotPasswordResponse>("/auth/resend-verification", payload);
}

export async function fetchVerificationStatus(
    email: string,
): Promise<VerificationStatusResponse> {
    const response = await fetch(
        `${API_BASE_URL}/auth/verification-status?email=${encodeURIComponent(email)}`,
    );

    if (!response.ok) {
        await parseError(response);
    }

    return (await response.json()) as VerificationStatusResponse;
}

// ─── Forgot Password (Email OTP) ────────────────────────────────────────────

export async function forgotPassword(
    payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
    return postJson<ForgotPasswordResponse>("/auth/forgot-password", payload);
}

export async function resendResetOtp(
    payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
    return postJson<ForgotPasswordResponse>("/auth/resend-reset-otp", payload);
}

export async function verifyResetOtp(
    payload: VerifyResetOtpPayload,
): Promise<VerifyResetOtpResponse> {
    return postJson<VerifyResetOtpResponse>("/auth/verify-reset-otp", payload);
}

export async function resetPassword(
    payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
    return postJson<ResetPasswordResponse>("/auth/reset-password", payload);
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        // If the token is invalid/expired, clear it so the user is redirected
        // to login on the next navigation.
        if (response.status === 401) {
            clearToken();
        }
        await parseError(response);
    }

    return (await response.json()) as AuthUser;
}

/**
 * Reusable fetch wrapper that injects the bearer token and throws an
 * `ApiError` on non-2xx responses. Used by other features (e.g. onboarding)
 * so they can call protected endpoints without re-implementing auth headers.
 */
export async function authedFetch<TResponse>(
    path: string,
    init?: RequestInit,
): Promise<TResponse> {
    const token = getToken();
    if (!token) {
        throw new ApiError(401, "You must be signed in to perform this action.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...init?.headers,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            clearToken();
        }
        await parseError(response);
    }

    if (response.status === 204) {
        return undefined as TResponse;
    }

    const body = await response.text();
    return (body ? JSON.parse(body) : undefined) as TResponse;
}

/**
 * Authenticated fetch for **multipart/form-data** uploads (e.g. audio
 * recordings). Unlike `authedFetch`, this does NOT set
 * `Content-Type: application/json` — the browser must set the multipart
 * boundary automatically when given a `FormData` body. Only the bearer
 * token is injected.
 *
 * Throws `ApiError` on non-2xx responses (same error parsing as
 * `authedFetch`).
 */
export async function authedFetchMultipart<TResponse>(
    path: string,
    body: FormData,
): Promise<TResponse> {
    const token = getToken();
    if (!token) {
        throw new ApiError(401, "You must be signed in to perform this action.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body,
    });

    if (!response.ok) {
        if (response.status === 401) {
            clearToken();
        }
        await parseError(response);
    }

    return (await response.json()) as TResponse;
}

/**
 * Authenticated fetch that returns **raw binary** (e.g. MP3 audio bytes
 * from the TTS endpoint). Injects the bearer token and returns the
 * `ArrayBuffer` on success. Throws `ApiError` on non-2xx responses.
 *
 * A `Content-Type: application/json` request body is sent by default; pass
 * `init` to override (e.g. for raw text bodies).
 */
export async function authedFetchBinary(
    path: string,
    init?: RequestInit,
): Promise<ArrayBuffer> {
    const token = getToken();
    if (!token) {
        throw new ApiError(401, "You must be signed in to perform this action.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...init?.headers,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            clearToken();
        }
        await parseError(response);
    }

    return await response.arrayBuffer();
}

/** Convenience: store a token immediately after auth. */
export function persistToken(token: string): void {
    setToken(token);
}
