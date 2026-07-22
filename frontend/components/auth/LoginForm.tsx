"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, EmailNotVerifiedError } from "@/features/auth/api";
import { saveVerificationEmail } from "@/features/auth/emailVerification";

type LoginFormProps = {
  onSignup?: () => void;
};

export default function LoginForm({ onSignup }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // login() stores the JWT, fetches /me and returns the AuthUser.
      // Route based on onboarding status: completed users go to the
      // dashboard; users who haven't finished onboarding go to /onboarding.
      const currentUser = await login({ email, password });
      router.push(currentUser.onboarding_completed ? "/dashboard" : "/onboarding");
    } catch (err) {
      if (err instanceof EmailNotVerifiedError) {
        saveVerificationEmail(err.email);
        router.push("/verify-email");
        return;
      }
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to sign in. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleSignup = () => {
    if (onSignup) {
      onSignup();
    } else {
      router.push("/signup");
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
          Welcome back
        </h2>
        <p className="text-sm leading-6 text-slate-500">
          Sign in to continue your English speaking journey with tailored practice and feedback.
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
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={Sparkles}
          autoComplete="email"
          required
        />

        <PasswordField
          label="Password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showPassword={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          required
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-500">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          className="font-medium text-blue-600 transition hover:text-blue-700"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Log in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={handleSignup}
          className="font-semibold text-blue-600 transition hover:text-blue-700"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
