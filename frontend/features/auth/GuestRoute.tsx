"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "./AuthContext";

type GuestRouteProps = {
    children: React.ReactNode;
    /**
     * Where to send an already-authenticated visitor who has completed
     * onboarding. Defaults to `/dashboard`.
     */
    redirectTo?: string;
};

/**
 * Inverse of {@link ProtectedRoute}. Used for public-only pages such as
 * `/login` and `/signup`.
 *
 * - While the auth state is still loading we render a spinner (so we don't
 *   flash the form before we know whether the user is logged in).
 * - Once resolved, an **authenticated** user is redirected away from the
 *   public form. If the user has not completed onboarding they are sent to
 *   `/onboarding`; otherwise they are sent to `redirectTo` (default
 *   `/dashboard`). This mirrors production behaviour where a logged-in user
 *   never sees the login/signup form. The current user (including the
 *   `onboarding_completed` flag) is already loaded by `AuthProvider` via
 *   `GET /auth/me`, so no extra request is needed here.
 * - An **unauthenticated** user sees the children (the form) as normal.
 */
export default function GuestRoute({
    children,
    redirectTo = "/dashboard",
}: GuestRouteProps) {
    const { status, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            const destination =
                user && !user.onboarding_completed ? "/onboarding" : redirectTo;
            router.replace(destination);
        }
    }, [status, user, router, redirectTo]);

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#EEF3FA]">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                    <p className="text-sm font-medium">Loading…</p>
                </div>
            </div>
        );
    }

    if (status === "authenticated") {
        return null;
    }

    return <>{children}</>;
}
