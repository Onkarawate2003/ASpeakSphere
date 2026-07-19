// SessionStorage persistence for the Forgot Password (Email OTP) flow.
//
// The flow spans three separate routes (/forgot-password → /verify-otp →
// /reset-password), so the email and the short-lived reset token need to
// survive the navigation between them. Mirrors the sessionStorage pattern
// already used by `features/conversation/ConversationContext.tsx` for the
// same reason (surviving navigation/refresh) rather than inventing a new one.

const STORAGE_KEY = "speakSphere:passwordReset";

type StoredResetState = {
    email: string;
    resetToken?: string;
};

function readState(): StoredResetState | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredResetState) : null;
    } catch {
        return null;
    }
}

function writeState(state: StoredResetState): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore (private mode, quota, etc.)
    }
}

/** Called after "Send OTP" — starts the flow with just the email. */
export function savePasswordResetEmail(email: string): void {
    writeState({ email });
}

/** Called after a successful OTP verification — adds the reset token. */
export function savePasswordResetToken(resetToken: string): void {
    const state = readState();
    if (!state) return;
    writeState({ ...state, resetToken });
}

export function getPasswordResetEmail(): string | null {
    return readState()?.email ?? null;
}

export function getPasswordResetToken(): string | null {
    return readState()?.resetToken ?? null;
}

export function clearPasswordResetState(): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
}
