"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import InputField from "./InputField";
import { ApiError, forgotPassword } from "@/features/auth/api";
import { savePasswordResetEmail } from "@/features/auth/passwordReset";

/**
 * Forgot Password — step 1 of the Email OTP reset flow.
 *
 * Mirrors `LoginForm`'s layout/branding exactly (same header, spacing,
 * button and input styles) so the flow reads as part of the same product,
 * per the "do not redesign" requirement.
 */
export default function ForgotPasswordForm() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await forgotPassword({ email });
            savePasswordResetEmail(email);
            toast.success("If an account exists for this email, an OTP has been sent.");
            router.push("/verify-otp");
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Unable to send the OTP. Please try again.");
            }
            toast.error("Couldn't send the OTP. Please try again.");
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
                    Forgot password?
                </h2>
                <p className="text-sm leading-6 text-slate-500">
                    Enter the email you registered with and we&apos;ll send you a 6-digit verification code to reset your password.
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

            <InputField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                icon={Mail}
                autoComplete="email"
                required
            />

            <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                    </>
                ) : (
                    <>
                        Send OTP
                        <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </button>

            <p className="text-center text-sm text-slate-500">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-600 transition hover:text-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                </Link>
            </p>
        </form>
    );
}
