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

// Fixed, reserved for this one-off diagnostic notification only — Phase 5's
// scheduled reminders will use their own id scheme, so this can't collide.
const TEST_NOTIFICATION_ID = 999999;
const TEST_NOTIFICATION_DELAY_MS = 5000;

/**
 * Schedules a one-off local notification a few seconds out, purely to
 * verify the plugin/channel/permission setup end-to-end (Phase 4). Reuses
 * `ensureNotificationPermission()` instead of checking/requesting permission
 * itself, and relies on the plugin's own default notification channel
 * (registered automatically at plugin load — see Android native review).
 *
 * Returns the permission state so callers can tell the difference between
 * "scheduled" (granted), "needs permission" (denied), and "native only"
 * (unsupported) without re-deriving that logic themselves.
 */
export async function sendTestNotification(): Promise<NotificationPermissionState> {
    const { state } = await ensureNotificationPermission();
    if (state !== "granted") {
        return state;
    }

    await LocalNotifications.schedule({
        notifications: [
            {
                id: TEST_NOTIFICATION_ID,
                title: "SpeakSphere Reminder",
                body: "Time to practice your English speaking!",
                schedule: { at: new Date(Date.now() + TEST_NOTIFICATION_DELAY_MS) },
            },
        ],
    });

    return state;
}

// Separate from TEST_NOTIFICATION_ID on purpose — cancelling/rescheduling
// the daily reminder must never touch the Phase 4 test notification.
const DAILY_REMINDER_ID = 100001;

// Accepts both what a spec-compliant `<input type="time">` produces
// ("15:37") and a 12-hour display string ("3:37 PM"), since which one
// actually reaches here can depend on the WebView/locale rendering the
// picker. Both resolve to the same 24-hour { hour, minute } shape that
// LocalNotifications' `on` schedule requires.
function parseReminderTime(time: string): { hour: number; minute: number } {
    const trimmed = time.trim();

    const twelveHour = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
    if (twelveHour) {
        const [, hourPart, minutePart, meridiem] = twelveHour;
        const rawHour = Number(hourPart);
        const minute = Number(minutePart);
        const isPM = meridiem.toUpperCase() === "PM";

        if (!Number.isInteger(rawHour) || rawHour < 1 || rawHour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
            throw new Error(`Invalid reminder time: "${time}"`);
        }

        // 12 AM -> 0, 12 PM -> 12, everything else -> +12 for PM only.
        const hour = rawHour === 12 ? (isPM ? 12 : 0) : isPM ? rawHour + 12 : rawHour;
        return { hour, minute };
    }

    const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (twentyFourHour) {
        const [, hourPart, minutePart] = twentyFourHour;
        const hour = Number(hourPart);
        const minute = Number(minutePart);
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
            throw new Error(`Invalid reminder time: "${time}"`);
        }
        return { hour, minute };
    }

    throw new Error(`Invalid reminder time: "${time}"`);
}

// Exported so smartReminderService's fallback text stays identical to what
// Phase 5 always used, instead of a second hardcoded copy of the string.
export const DEFAULT_DAILY_REMINDER_BODY = "Your English practice session is waiting!";

/**
 * Schedules (or reschedules) the daily practice reminder for the given
 * "HH:MM" time, repeating every day thereafter. Reuses
 * `ensureNotificationPermission()` rather than checking/requesting
 * permission itself.
 *
 * `body` defaults to the fixed Phase 5 message, so any existing caller that
 * doesn't pass one keeps behaving exactly as before. Phase 7 passes a
 * rule-based message computed by `smartReminderService.ts` instead — this
 * function has no knowledge of that logic, it only ever displays the string
 * it's given.
 *
 * Uses the plugin's `on: { hour, minute }` cron-style schedule rather than
 * `at` + `repeats: true`. The two are NOT equivalent here: this plugin's
 * native Android implementation repeats an `at` schedule using the interval
 * between "now" and the first fire time, which drifts every day instead of
 * firing every 24 hours. `on: { hour, minute }` is handled differently — the
 * native side recomputes the next occurrence (today if still upcoming,
 * otherwise tomorrow) after every single fire, so it reliably lands on the
 * same wall-clock time every day, indefinitely.
 */
export async function scheduleDailyReminder(
    time: string,
    body: string = DEFAULT_DAILY_REMINDER_BODY,
): Promise<NotificationPermissionState> {
    const { state } = await ensureNotificationPermission();
    if (state !== "granted") {
        return state;
    }

    const { hour, minute } = parseReminderTime(time);

    await LocalNotifications.schedule({
        notifications: [
            {
                id: DAILY_REMINDER_ID,
                title: "SpeakSphere Reminder",
                body,
                schedule: { on: { hour, minute }, allowWhileIdle: true },
            },
        ],
    });

    return state;
}

/**
 * Cancels the scheduled daily reminder, if any. Only ever targets
 * `DAILY_REMINDER_ID` — never the Phase 4 test notification.
 */
export async function cancelDailyReminder(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
}
