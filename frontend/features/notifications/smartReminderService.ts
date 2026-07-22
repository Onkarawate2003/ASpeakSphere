import type { ProgressResponseDTO } from "@/features/progress/types";
import { DEFAULT_DAILY_REMINDER_BODY } from "./notificationService";

const INACTIVITY_THRESHOLD_DAYS = 3;

function daysSinceLastPractice(lastCompletedDate: string | null): number | null {
    if (!lastCompletedDate) {
        return null;
    }

    const last = new Date(lastCompletedDate);
    if (Number.isNaN(last.getTime())) {
        return null;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((Date.now() - last.getTime()) / msPerDay);
}

/**
 * Rule-based (no AI, no external calls) selection of the daily reminder's
 * body text, from the same progress data already shown on the dashboard/
 * stats page — no separate store, no duplicated fetch.
 *
 * Priority, most specific first: a brand-new user who has never practiced,
 * then a lapsed user who hasn't practiced in a while, then an active streak
 * worth protecting, then the generic Phase 5 fallback.
 */
export function generateSmartReminderMessage(progress: ProgressResponseDTO | null): string {
    if (!progress) {
        return DEFAULT_DAILY_REMINDER_BODY;
    }

    const totalSessions = progress.completed_lessons + progress.completed_conversations + progress.completed_quizzes;
    if (totalSessions === 0) {
        return "Ready to start your English journey? Practice today!";
    }

    const inactiveDays = daysSinceLastPractice(progress.last_completed_date);
    if (inactiveDays !== null && inactiveDays >= INACTIVITY_THRESHOLD_DAYS) {
        return "Your English journey is waiting! Let's practice today.";
    }

    if (progress.current_streak > 0) {
        return "Keep your streak alive! Continue your English practice.";
    }

    return DEFAULT_DAILY_REMINDER_BODY;
}
