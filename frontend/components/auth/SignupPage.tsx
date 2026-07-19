"use client";

import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Globe, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SocialSignupButton from "./SocialSignupButton";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, EmailNotVerifiedError } from "@/features/auth/api";
import { saveVerificationEmail } from "@/features/auth/emailVerification";
import { useGoogleAuth } from "@/features/auth/useGoogleAuth";

const GoogleLogo = (
    <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden>
        <path fill="#4285f4" d="M533.5 278.4c0-18.5-1.6-36.2-4.6-53.4H272v100.9h146.9c-6.3 34-25.5 62.8-54.6 82v68h88.2c51.5-47.5 81-117.6 81-197.5z" />
        <path fill="#34a853" d="M272 544.3c73.6 0 135.5-24.3 180.7-66.1l-88.2-68c-24.6 16.6-56 26.5-92.5 26.5-71 0-131.1-47.9-152.6-112.2H28.4v70.8C73.4 492.1 167.2 544.3 272 544.3z" />
        <path fill="#fbbc04" d="M119.4 323.5c-10.8-32.3-10.8-66.9 0-99.2V153.5H28.4c-39.9 79.8-39.9 174.4 0 254.2l91-84.2z" />
        <path fill="#ea4335" d="M272 107.7c39.8 0 75.7 13.7 104 40.7l78.1-78.1C408.2 24.2 345.7 0 272 0 167.2 0 73.4 52.2 28.4 153.5l91 70.8C140.9 155.6 201 107.7 272 107.7z" />
    </svg>
);

type SignupPageProps = {
    onBack?: () => void;
};

export default function SignupPage({ onBack }: SignupPageProps) {
    const router = useRouter();
    const { register } = useAuth();
    const googleAuth = useGoogleAuth();

    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Registration form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // trigger subtle fade-in on mount
        const t = setTimeout(() => setMounted(true), 20);
        return () => clearTimeout(t);
    }, []);

    const handleEmail = () => {
        setShowForm(true);
        setError(null);
    };

    const handleBack = () => {
        // If user is filling the email form,
        // go back to the Google/Email selection.
        if (showForm) {
            setShowForm(false);
            setError(null);
            return;
        }

        // If SignupPage is opened as a modal from LoginPage
        if (onBack) {
            onBack();
            return;
        }

        // If SignupPage is opened from /signup
        router.push("/");
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();

        if (!trimmedFirst || !trimmedLast) {
            setError("First name and last name are required.");
            setLoading(false);
            return;
        }

        try {
            // register() never logs the user in directly — every new
            // account starts unverified, so it always rejects with
            // EmailNotVerifiedError (see AuthContext) once the account is
            // created and the verification email is sent.
            await register({
                first_name: trimmedFirst,
                last_name: trimmedLast,
                email,
                password,
            });
        } catch (err) {
            if (err instanceof EmailNotVerifiedError) {
                saveVerificationEmail(err.email);
                toast.success("Account created! Check your email for a verification code.");
                router.push("/verify-email");
                return;
            }
            if (err instanceof ApiError) {
                setError(err.detail);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unable to create your account. Please try again.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full">
            {/* Soft blurred overlay circles to simulate a subtle image */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-20 blur-3xl" />
                <div className="absolute -right-32 -bottom-24 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-18 blur-3xl" />
            </div>

            <div className="absolute inset-0 -z-5 bg-slate-950/5" />

            <div className="flex items-center justify-center px-6 py-8">
                <div className="w-full max-w-md">
                    <div
                        className={`relative backdrop-blur-lg rounded-3xl border border-slate-200/70 bg-white/95 px-8 py-10 shadow-2xl transform transition-all duration-400 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                            }`}
                        role="region"
                        aria-labelledby="signup-heading"
                    >

                        {/* Back Button (optional) */}
                        <div className="mb-4">
                            <button
                                onClick={handleBack}
                                className="mb-2 flex items-center text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                                aria-label="Go back"
                            >
                                ← Back
                            </button>
                        </div>

                        <div className="mb-6 text-center">
                            <h1 id="signup-heading" className="text-3xl font-bold text-slate-900">
                                {showForm ? "Create your account" : "Create your account"}
                            </h1>
                            <p className="mt-3 text-sm text-slate-700 max-w-[42ch] mx-auto">
                                <span className="text-base">Join ASpeakSphere and start improving your English with AI.</span>
                            </p>
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                            >
                                {error}
                            </div>
                        )}

                        {!showForm ? (
                            <div className="space-y-3">
                                <SocialSignupButton
                                    label={googleAuth.loading ? "Continuing with Google..." : "Continue with Google"}
                                    icon={GoogleLogo}
                                    variant="primary"
                                    onClick={googleAuth.signIn}
                                    loading={googleAuth.loading}
                                    ariaLabel="Continue with Google"
                                />
                                {/* Off-screen host for Google's real button — see useGoogleAuth. */}
                                <div
                                    id={googleAuth.containerId}
                                    aria-hidden
                                    className="pointer-events-none absolute -left-[9999px] top-0 opacity-0"
                                />

                                <div className="flex items-center justify-center py-2">
                                    <div className="h-px w-full bg-slate-200" />
                                    <span className="mx-3 text-xs text-slate-500">or</span>
                                    <div className="h-px w-full bg-slate-200" />
                                </div>

                                <SocialSignupButton
                                    label={loading ? "Preparing email..." : "Continue with Email"}
                                    icon={Mail}
                                    variant="secondary"
                                    onClick={handleEmail}
                                    loading={loading}
                                    ariaLabel="Continue with Email"
                                />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                <InputField
                                    label="First name"
                                    name="first_name"
                                    type="text"
                                    placeholder="Jane"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    icon={UserIcon}
                                    autoComplete="given-name"
                                    required
                                />
                                <InputField
                                    label="Last name"
                                    name="last_name"
                                    type="text"
                                    placeholder="Doe"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    icon={UserIcon}
                                    autoComplete="family-name"
                                    required
                                />
                                <InputField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    icon={Mail}
                                    autoComplete="email"
                                    required
                                />
                                <PasswordField
                                    label="Password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    showPassword={showPassword}
                                    onToggle={() => setShowPassword((v) => !v)}
                                    autoComplete="new-password"
                                    required
                                />

                                <p className="text-xs text-slate-500">
                                    Password must be at least 8 characters.
                                </p>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Creating account…
                                        </>
                                    ) : (
                                        "Create account"
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="mt-5 text-center text-sm text-slate-600">
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
                                Sign in
                            </Link>
                        </div>

                        <div className="mt-6 text-xs text-center text-slate-500">
                            By continuing, you agree to our <Link href="#" className="font-medium text-slate-700">Privacy Policy</Link> and <Link href="#" className="font-medium text-slate-700">Terms of Service</Link>.
                        </div>

                        <div className="mt-4 text-center text-sm text-slate-600">No credit card required</div>
                    </div>

                    <div className="mt-6 text-center text-xs text-slate-500">Need help? <Link href="#" className="text-slate-700 font-medium">Contact support</Link></div>
                </div>
            </div>
        </div>
    );
}
