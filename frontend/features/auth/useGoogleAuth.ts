"use client";

// Google Authentication (Google OAuth 2.0) — loads Google Identity Services
// and exchanges the resulting ID Token for our own JWT via `loginWithGoogle`
// (AuthContext), then routes exactly like the email login/verify flows do:
// completed onboarding -> /dashboard, otherwise -> /onboarding.
//
// The existing UI ("Continue with Google" on both Login and Signup) is a
// custom-styled button, not Google's own <div>. Google Identity Services
// only issues an ID Token from *its own* rendered button/One Tap prompt, so
// this hook renders that real button into an off-screen container (found via
// a stable DOM id, not a React ref — see `containerId` below) and forwards
// clicks from our custom button to it. Standard technique for pairing a
// custom button with GIS. See:
// https://developers.google.com/identity/gsi/web/guides/personalized-button

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "./AuthContext";
import { ApiError } from "./api";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                        auto_select?: boolean;
                    }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: Record<string, unknown>,
                    ) => void;
                };
            };
        };
    }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Google Sign-In is only available in the browser."));
    }
    if (window.google?.accounts?.id) {
        return Promise.resolve();
    }
    if (!googleScriptPromise) {
        googleScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(
                `script[src="${GOOGLE_SCRIPT_SRC}"]`,
            );
            if (existing) {
                existing.addEventListener("load", () => resolve());
                existing.addEventListener("error", () =>
                    reject(new Error("Failed to load Google Sign-In.")),
                );
                return;
            }
            const script = document.createElement("script");
            script.src = GOOGLE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Google Sign-In."));
            document.head.appendChild(script);
        });
    }
    return googleScriptPromise;
}

/**
 * Returns everything a "Continue with Google" button needs:
 * - `containerId`: pass to the `id` prop of an off-screen `<div>` that hosts
 *   Google's real button (required so GIS has something to click on our
 *   behalf). A plain string (from `useId`), not a React ref.
 * - `signIn`: call from the custom button's `onClick`.
 * - `loading`: true while the credential is being exchanged for our JWT.
 * - `isConfigured`: false when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` hasn't been set.
 */
export function useGoogleAuth() {
    const router = useRouter();
    const { loginWithGoogle } = useAuth();
    const reactId = useId();
    const containerId = `google-signin-btn-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const [loading, setLoading] = useState(false);

    // Always call the *latest* handler even though it's registered with GIS
    // only once (Google's `callback` is captured at `initialize` time).
    // Updated in an effect (not during render) since mutating a ref's
    // `.current` while rendering is not allowed.
    const handleCredentialRef = useRef<(credential: string) => void>(() => {});
    useEffect(() => {
        handleCredentialRef.current = async (credential: string) => {
            setLoading(true);
            try {
                const user = await loginWithGoogle(credential);
                router.push(user.onboarding_completed ? "/dashboard" : "/onboarding");
            } catch (err) {
                const message =
                    err instanceof ApiError
                        ? err.detail
                        : "Unable to continue with Google. Please try again.";
                toast.error(message);
            } finally {
                setLoading(false);
            }
        };
    });

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        let cancelled = false;

        loadGoogleScript()
            .then(() => {
                if (cancelled || !window.google) return;
                const container = document.getElementById(containerId);
                if (!container) return;
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response) => handleCredentialRef.current(response.credential),
                });
                window.google.accounts.id.renderButton(container, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    width: 320,
                });
            })
            .catch(() => {
                // signIn() surfaces a clear error on click if this failed.
            });

        return () => {
            cancelled = true;
        };
    }, [containerId]);

    const signIn = useCallback(() => {
        if (!GOOGLE_CLIENT_ID) {
            toast.error("Google Sign-In is not configured yet.");
            return;
        }
        const container = document.getElementById(containerId);
        const button = container?.querySelector<HTMLElement>('div[role="button"]');
        if (!button) {
            toast.error("Google Sign-In is still loading. Please try again in a moment.");
            return;
        }
        button.click();
    }, [containerId]);

    return { containerId, signIn, loading, isConfigured: Boolean(GOOGLE_CLIENT_ID) };
}
