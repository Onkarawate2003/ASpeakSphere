// SessionStorage persistence for the Email Verification flow.
//
// Reached from two entry points — Signup (register always responds with
// `verification_required: true`) and Login (unverified account) — so
// `/verify-email` needs to know which email to verify. Mirrors the
// sessionStorage pattern already used by `features/auth/passwordReset.ts`
// for the Forgot Password flow, for the same reason (surviving
// navigation/refresh) rather than inventing a new one.

const STORAGE_KEY = "speakSphere:emailVerification";

type StoredVerificationState = {
    email: string;
};

function readState(): StoredVerificationState | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredVerificationState) : null;
    } catch {
        return null;
    }
}

function writeState(state: StoredVerificationState): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore (private mode, quota, etc.)
    }
}

/** Called after Signup or an unverified Login attempt — starts the flow. */
export function saveVerificationEmail(email: string): void {
    writeState({ email });
}

export function getVerificationEmail(): string | null {
    return readState()?.email ?? null;
}

export function clearVerificationState(): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
}
