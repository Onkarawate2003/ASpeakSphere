"use client";

import LoginPage from "@/components/auth/LoginPage";
import GuestRoute from "@/features/auth/GuestRoute";

export default function Login() {
  return (
    <GuestRoute>
      <LoginPage />
    </GuestRoute>
  );
}
