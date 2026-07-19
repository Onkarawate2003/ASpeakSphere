"use client";

import SignupPage from "@/components/auth/SignupPage";
import GuestRoute from "@/features/auth/GuestRoute";

export default function Page() {
  return (
    <GuestRoute>
      <SignupPage />
    </GuestRoute>
  );
}
