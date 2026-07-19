"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "./AuthContext";

type ProtectedRouteProps = {
    children: React.ReactNode;
    /**
     * Where to send an unauthenticated visitor. Defaults to `/login`.
     */
    redirectTo?: string;
};

/**
 * Guards a route segment. While the auth state is still loading we render a
 * spinner (avoiding a flash of the protected content). Once resolved:
 *
 * - Unauthenticated users are redirected to `redirectTo` (default `/login`).
 * - Authenticated users see the protected children.
 *
 * Onboarding-aware routing is intentionally NOT performed here. The dashboard
 * is a valid destination for any authenticated user, and onboarding completion
 * is enforced elsewhere: by `GuestRoute` (for already-authenticated visitors
 * hitting `/login` or `/signup`) and by the login/signup form handlers (after
 * a fresh authentication). Keeping this guard auth-only avoids redirect loops
 * between `/dashboard` and `/onboarding`.
 */
export default function ProtectedRoute({
    children,
    redirectTo = "/login",
}: ProtectedRouteProps) {
    const { status } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace(redirectTo);
        }
    }, [status, router, redirectTo]);

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

    if (status === "unauthenticated") {
        return null;
    }

    return <>{children}</>;
}
