"use client";

import { useDashboard } from "@/features/dashboard/DashboardContext";
import {
    AchievementsCard,
    DailyGoalCard,
    DashboardLayout,
    PracticeCard,
    ProfileSummary,
    ProgressCard,
    RecentActivity,
    StatisticsCard,
    WelcomeCard,
    LoadingSkeleton,
    ErrorState,
    EmptyState,
} from "../../components/dashboard";

export default function DashboardPage() {
    const { preferences, isLoading, error, refreshPreferences } = useDashboard();

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <LoadingSkeleton rows={3} />
                    <div className="grid gap-6 md:grid-cols-2">
                        <LoadingSkeleton rows={2} />
                        <LoadingSkeleton rows={2} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="py-10">
                    <ErrorState
                        title="Failed to load dashboard data"
                        description={error}
                        onRetry={refreshPreferences}
                    />
                </div>
            </DashboardLayout>
        );
    }

    if (!preferences) {
        return (
            <DashboardLayout>
                <div className="py-10">
                    <EmptyState
                        title="No onboarding preferences found"
                        description="Please complete your onboarding setup to personalize your speaking practice."
                        actionLabel="Go to Onboarding"
                        actionHref="/onboarding"
                    />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <WelcomeCard />

            <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
                <div className="grid gap-6 md:grid-cols-2">
                    <DailyGoalCard />
                    <ProgressCard />
                </div>

                <aside className="space-y-6">
                    <PracticeCard />
                    <StatisticsCard />
                    <RecentActivity />
                    <AchievementsCard />
                    <ProfileSummary />
                </aside>
            </div>
        </DashboardLayout>
    );
}
