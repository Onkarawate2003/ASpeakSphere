import { Capacitor } from "@capacitor/core";
import type { PermissionState } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

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

/**
 * Final notification permission state, as reported by the OS. `"unsupported"`
 * covers non-native platforms, where the OS permission model doesn't apply.
 */
export type NotificationPermissionState = PermissionState | "unsupported";

export interface NotificationPermissionResult {
    state: NotificationPermissionState;
}

/**
 * Single entry point for notification permission handling — the rest of the
 * app calls this instead of touching `@capacitor/local-notifications`
 * directly. Checks the current OS permission state and only requests it if
 * it isn't already granted, so a caller can invoke this freely (e.g. every
 * time the user enables reminders) without ever triggering a redundant
 * system dialog.
 *
 * Unlike `initialize()`, this is deliberately NOT cached behind a
 * module-scoped promise: permission state can change at any time via
 * Android system settings, so every call re-checks the live OS state
 * instead of returning a stale cached result.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermissionResult> {
    if (!Capacitor.isNativePlatform()) {
        return { state: "unsupported" };
    }

    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") {
        return { state: current.display };
    }

    const requested = await LocalNotifications.requestPermissions();
    return { state: requested.display };
}
