"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import PasswordField from "./PasswordField";
import { ApiError, resetPassword } from "@/features/auth/api";
import {
    clearPasswordResetState,
    getPasswordResetToken,
} from "@/features/auth/passwordReset";
import { showSuccessAlert } from "@/lib/sweetAlert";

/**
 * Reset Password — step 3 (final) of the Email OTP reset flow.
 *
 * Mirrors `LoginForm`'s layout/branding and reuses `PasswordField` exactly
 * as the login/signup forms do.
 */
export default function ResetPasswordForm() {
    const router = useRouter();

    // Lazy-initialized from sessionStorage (read once, not via a setState
    // effect) — the effect below only handles the redirect side-effect.
    const [resetToken] = useState<string | null>(() => getPasswordResetToken());
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Arriving here without a verified OTP is invalid — send the learner
    // back to start the flow properly.
    useEffect(() => {
        if (!resetToken) {
            router.replace("/forgot-password");
        }
    }, [resetToken, router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!resetToken) return;
        setError(null);

        // Existing password rules (mirrors UserCreate.password on the backend).
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await resetPassword({
                reset_token: resetToken,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            clearPasswordResetState();
            await showSuccessAlert({
                title: "Password changed successfully.",
                text: "You can now sign in with your new password.",
            });
            router.push("/login");
        } catch (err) {
            const message =
                err instanceof ApiError ? err.detail : "Unable to reset your password. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900">ASpeakSphere</p>
                    <p className="text-sm text-slate-500">Your AI English coach</p>
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-5xl font-bold tracking-tight text-slate-900">
                    Reset password
                </h2>
                <p className="text-sm leading-6 text-slate-500">
                    Choose a new password for your account.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            <div className="space-y-8">
                <PasswordField
                    label="New password"
                    name="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    showPassword={showNewPassword}
                    onToggle={() => setShowNewPassword((value) => !value)}
                    autoComplete="new-password"
                    required
                />

                <PasswordField
                    label="Confirm password"
                    name="confirm-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    showPassword={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                    autoComplete="new-password"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading || !resetToken}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Resetting…
                    </>
                ) : (
                    <>
                        Reset Password
                        <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </button>
        </form>
    );
}
