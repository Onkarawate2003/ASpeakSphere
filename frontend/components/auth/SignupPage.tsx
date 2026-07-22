"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SocialSignupButton from "./SocialSignupButton";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, EmailNotVerifiedError } from "@/features/auth/api";
import { saveVerificationEmail } from "@/features/auth/emailVerification";

type SignupPageProps = {
    onBack?: () => void;
};

export default function SignupPage({ onBack }: SignupPageProps) {
    const router = useRouter();
    const { register } = useAuth();

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
