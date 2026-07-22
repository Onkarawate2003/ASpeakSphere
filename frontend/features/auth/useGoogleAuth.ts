"use client";

// Google Authentication (Google OAuth 2.0) — exchanges a Google ID Token for
// our own JWT via `loginWithGoogle` (AuthContext), then routes exactly like
// the email login/verify flows do: completed onboarding -> /dashboard,
// otherwise -> /onboarding.
//
// Uses `@capgo/capacitor-social-login` rather than loading
// `https://accounts.google.com/gsi/client` directly: Google's Identity
// Services script is browser-only and never becomes interactive inside a
// Capacitor Android WebView (Google's own anti-phishing WebView detection
// blocks it), so a button wired to raw GIS gets stuck permanently "loading"
// on-device even though it works fine in a normal browser tab. This plugin
// uses Android's native Credential Manager on-device and falls back to GIS
// on web, so the same code path works in both.
//
// `webClientId` below must be the **Web** OAuth client (same value as
// `GOOGLE_CLIENT_ID` in the backend's .env) — Android's Credential Manager
// still needs a matching **Android** OAuth client registered in Google Cloud
// Console (package name + signing SHA-1), but that client id is never passed
// here; Google resolves it from the app's package + signature automatically.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SocialLogin } from "@capgo/capacitor-social-login";

import { useAuth } from "./AuthContext";
import { ApiError } from "./api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let initPromise: Promise<void> | null = null;

// TEMP DEBUG — dumps every enumerable + own property of an error (Capacitor
// plugin errors are often plain Error instances with an extra `.code`, which
// JSON.stringify(err) alone would silently drop). Remove once the real
// native exception has been identified.
function describeError(err: unknown): string {
    if (err instanceof Error) {
        return JSON.stringify({
            name: err.name,
            message: err.message,
            code: (err as { code?: string }).code,
            stack: err.stack,
        });
    }
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

function ensureInitialized(): Promise<void> {
    if (!GOOGLE_CLIENT_ID) {
        return Promise.reject(new Error("Google Sign-In is not configured yet."));
    }
    if (!initPromise) {
        console.log("[GoogleAuth] initialize() starting, webClientId =", GOOGLE_CLIENT_ID);
        initPromise = SocialLogin.initialize({
            google: { webClientId: GOOGLE_CLIENT_ID },
        })
            .then(() => {
                console.log("[GoogleAuth] initialize() succeeded");
            })
            .catch((err) => {
                console.error("[GoogleAuth] initialize() FAILED:", err);
                console.error("[GoogleAuth] initialize() FAILED (details):", describeError(err));
                initPromise = null; // allow retry on next signIn()
                throw err;
            });
    }
    return initPromise;
}

/**
 * Returns everything a "Continue with Google" button needs:
 * - `signIn`: call from the custom button's `onClick`.
 * - `loading`: true while the credential is being exchanged for our JWT.
 * - `isConfigured`: false when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` hasn't been set.
 */
export function useGoogleAuth() {
    const router = useRouter();
    const { loginWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);

    // Warm up the plugin (and, on web, Google's script tag) as soon as the
    // button mounts so the first tap isn't slowed down by initialization.
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        ensureInitialized().catch(() => {
            // signIn() surfaces a clear error on click if this failed.
        });
    }, []);

    const signIn = useCallback(async () => {
        if (!GOOGLE_CLIENT_ID) {
            toast.error("Google Sign-In is not configured yet.");
            return;
        }

        setLoading(true);
        try {
            console.log("[GoogleAuth] signIn() -> ensureInitialized()");
            await ensureInitialized();

            console.log("[GoogleAuth] signIn() -> SocialLogin.login()");
            // No custom `scopes` here on purpose: the plugin's Android side
            // always requests openid + userinfo.email + userinfo.profile by
            // default (see GoogleProvider.java), which is everything our
            // backend needs (email, email_verified, given_name, family_name
            // — see backend/app/api/v1/auth.py). Passing ANY custom `scopes`
            // array — even a redundant one — makes the native plugin require
            // MainActivity to implement `ModifiedMainActivityForSocialLoginPlugin`
            // (an opt-in for incremental-auth scopes we don't use), which is
            // why this call must stay scope-less.
            const { result } = await SocialLogin.login({
                provider: "google",
                options: {},
            });
            console.log("[GoogleAuth] login() result:", JSON.stringify(result));

            const idToken = "idToken" in result ? result.idToken : null;
            console.log("[GoogleAuth] idToken present:", Boolean(idToken));
            if (!idToken) {
                throw new Error("Google did not return an ID token.");
            }

            console.log("[GoogleAuth] signIn() -> loginWithGoogle() (POST /auth/google)");
            const user = await loginWithGoogle(idToken);
            console.log("[GoogleAuth] backend exchange succeeded");
            router.push(user.onboarding_completed ? "/dashboard" : "/onboarding");
        } catch (err) {
            // TEMP DEBUG — surfaces the real exception instead of a generic
            // toast. Revert to the block below once the cause is confirmed:
            //   const message = err instanceof ApiError ? err.detail : "Unable to continue with Google. Please try again.";
            console.error("[GoogleAuth] signIn() FAILED — raw error:", err);
            console.error("[GoogleAuth] signIn() FAILED — details:", describeError(err));
            const message =
                err instanceof ApiError
                    ? err.detail
                    : err instanceof Error
                        ? err.message
                        : describeError(err);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [router, loginWithGoogle]);

    return { signIn, loading, isConfigured: Boolean(GOOGLE_CLIENT_ID) };
}
