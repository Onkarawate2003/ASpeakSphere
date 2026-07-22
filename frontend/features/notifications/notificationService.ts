import { Capacitor } from "@capacitor/core";

// Module-scoped, not React state — mirrors `useGoogleAuth.ts`'s `initPromise`
// singleton so repeated calls (re-mounts, React StrictMode double-invoke)
// collapse into a single initialization instead of running twice.
let initPromise: Promise<void> | null = null;

async function performInitialization(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        // No web equivalent is implemented here on purpose — the browser
        // Notification API is a different, unrelated surface. This is a
        // hard no-op, not a fallback.
        return;
    }

    // Platform check passed. Intentionally empty beyond this point: this
    // step only establishes the initialization entry point. Permission
    // requests, channel creation, listener registration, and scheduling
    // are out of scope for this step and will be added inside this same
    // guarded function by later phases.
}

/**
 * Initializes the local notification subsystem exactly once per app
 * session. Safe to call multiple times — subsequent calls return the same
 * in-flight/completed promise instead of re-running initialization.
 */
export function initialize(): Promise<void> {
    if (!initPromise) {
        initPromise = performInitialization().catch((err) => {
            // Allow a retry on the next call if this attempt failed.
            initPromise = null;
            throw err;
        });
    }
    return initPromise;
}
