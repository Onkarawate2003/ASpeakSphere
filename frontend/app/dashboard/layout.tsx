import ProtectedRoute from "@/features/auth/ProtectedRoute";
import { DashboardProvider } from "@/features/dashboard/DashboardContext";
import { ProgressProvider } from "@/features/progress/ProgressContext";
import { AccentProvider } from "@/features/accent/AccentContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute redirectTo="/login">
            <DashboardProvider>
                <AccentProvider>
                    <ProgressProvider>
                        {children}
                    </ProgressProvider>
                </AccentProvider>
            </DashboardProvider>
        </ProtectedRoute>
    );
}
