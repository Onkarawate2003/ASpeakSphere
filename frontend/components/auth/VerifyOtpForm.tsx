"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
    ApiError,
    fetchVerificationStatus,
    resendResetOtp,
    resendVerification,
    verifyResetOtp,
} from "@/features/auth/api";
import {
    getPasswordResetEmail,
    savePasswordResetToken,
} from "@/features/auth/passwordReset";
import {
    clearVerificationState,
    getVerificationEmail,
} from "@/features/auth/emailVerification";
import { useAuth } from "@/features/auth/AuthContext";

const RESEND_COOLDOWN_SECONDS = 60;

type VerifyOtpFormProps = {
    /**
     * Which OTP flow this instance drives:
     *  - "reset" (default): Forgot Password, step 2 — verifies against
     *    `verify-reset-otp` and continues to `/reset-password`.
     *  - "email": Email Verification (post-signup, or an unverified login
     *    attempt) — verifies against `verify-email` and continues straight
     *    into onboarding or the dashboard, exactly like a normal login.
     */
    mode?: "reset" | "email";
};

/**
 * Verify OTP — shared by the Forgot Password flow (step 2) and the Email
 * Verification flow. Mirrors `LoginForm`'s layout/branding. The 6-digit
 * code is a single numeric `InputField`-style input (no existing
 * segmented-OTP-input component exists in this codebase, so this stays
 * closest to "reuse existing InputField" without introducing new UI
 * patterns).
 */
export default function VerifyOtpForm({ mode = "reset" }: VerifyOtpFormProps) {
    const router = useRouter();
    const { verifyEmail } = useAuth();

    // Lazy-initialized from sessionStorage (read once, not via a setState
    // effect) — the effect below only handles the redirect side-effect.
    const [email] = useState<string | null>(() =>
        mode === "email" ? getVerificationEmail() : getPasswordResetEmail(),
    );
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

    // Arriving here without having started the flow is invalid — send the
    // learner back to where it starts.
    useEffect(() => {
        if (!email) {
            router.replace(mode === "email" ? "/login" : "/forgot-password");
        }
    }, [email, router, mode]);

    // If the account was already verified elsewhere (e.g. a second tab),
    // skip the OTP form entirely rather than let the learner hit a
    // confusing "invalid OTP" for a code that's already been consumed.
    useEffect(() => {
        if (mode !== "email" || !email) return;
        let active = true;
        fetchVerificationStatus(email)
            .then((status) => {
                if (active && status.is_email_verified) {
                    clearVerificationState();
                    toast.success("Your email is already verified. Please sign in.");
                    router.replace("/login");
                }
            })
            .catch(() => {
                // Best-effort; the OTP form below still works if this fails.
            });
        return () => {
            active = false;
        };
    }, [mode, email, router]);

    // 60-second resend countdown, restarted on mount and after every resend.
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 6);
        setOtp(digitsOnly);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email) return;
        setError(null);

        if (otp.length !== 6) {
            setError("Enter the 6-digit code sent to your email.");
            return;
        }

        setLoading(true);
        try {
            if (mode === "email") {
                const user = await verifyEmail({ email, otp });
                clearVerificationState();
                toast.success("Email verified.");
                router.push(user.onboarding_completed ? "/dashboard" : "/onboarding");
            } else {
                const { reset_token } = await verifyResetOtp({ email, otp });
                savePasswordResetToken(reset_token);
                toast.success("Code verified.");
                router.push("/reset-password");
            }
        } catch (err) {
            const message =
                err instanceof ApiError ? err.detail : "Unable to verify the OTP. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email || cooldown > 0 || resending) return;
        setResending(true);
        setError(null);
        try {
            if (mode === "email") {
                await resendVerification({ email });
            } else {
                await resendResetOtp({ email });
            }
            setCooldown(RESEND_COOLDOWN_SECONDS);
            toast.success("A new code has been sent to your email.");
        } catch {
            toast.error("Couldn't resend the code. Please try again.");
        } finally {
            setResending(false);
        }
    };

    const heading = mode === "email" ? "Email Verification" : "Verify your code";
    const subtitle =
        mode === "email"
            ? "Enter the verification code sent to your email."
            : email
                ? `Enter the 6-digit code we sent to ${email}.`
                : "Enter the 6-digit code we sent to your email.";
    const resendLabel = mode === "email" ? "Resend Code" : "Resend OTP";

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
                    {heading}
                </h2>
                <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-slate-700">
                    Verification code
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                        id="otp"
                        name="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={otp}
                        onChange={handleOtpChange}
                        maxLength={6}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-center text-lg font-semibold tracking-[0.5em] text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || !email}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying…
                    </>
                ) : (
                    <>
                        {mode === "email" ? "Verify Email" : "Verify"}
                        <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </button>

            <p className="text-center text-sm text-slate-500">
                Didn&apos;t get the code?{" "}
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || resending}
                    className="font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                    {resending
                        ? "Resending…"
                        : cooldown > 0
                            ? `${resendLabel} (${cooldown}s)`
                            : resendLabel}
                </button>
            </p>

            <p className="text-center text-sm text-slate-500">
                {mode === "email" ? (
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                ) : (
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center gap-1.5 font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Use a different email
                    </Link>
                )}
            </p>
        </form>
    );
}
