import { OnboardingProvider } from "@/features/onboarding/OnboardingContext";
import ProtectedRoute from "@/features/auth/ProtectedRoute";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute redirectTo="/login">
            <OnboardingProvider>{children}</OnboardingProvider>
        </ProtectedRoute>
    );
}
