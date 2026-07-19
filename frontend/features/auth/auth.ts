// Token persistence helpers.
//
// The JWT is stored in localStorage so the session survives page reloads.
// A small wrapper keeps the storage key in one place and is SSR-safe.

export const TOKEN_STORAGE_KEY = "aspeaksphere:token";

export function getToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}
