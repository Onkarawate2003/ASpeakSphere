"use client";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import GuestRoute from "@/features/auth/GuestRoute";

export default function ForgotPasswordPage() {
    return (
        <GuestRoute>
            <main className="flex min-h-screen items-center justify-center bg-[#EEF3FA] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
                <div className="w-full max-w-md rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_25px_80px_-24px_rgba(15,23,42,0.2)] sm:p-8">
                    <ForgotPasswordForm />
                </div>
            </main>
        </GuestRoute>
    );
}
