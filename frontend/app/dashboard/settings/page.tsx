"use client";

import { useState, useEffect, FormEvent } from "react";
import {
    Bell,
    BookOpen,
    CalendarDays,
    Check,
    CheckCircle2,
    Flame,
    Globe2,
    Languages,
    Loader2,
    Mail,
    Mic2,
    Moon,
    Settings as SettingsIcon,
    ShieldQuestion,
    Target,
    UserRound,
    XCircle,
} from "lucide-react";

import { DashboardLayout, LoadingSkeleton } from "../../../components/dashboard";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useAccent } from "@/features/accent/AccentContext";
import { showSuccessAlert, showErrorAlert } from "@/lib/sweetAlert";
import {
    learningGoalLabels,
    proficiencyLevelLabels,
} from "@/features/dashboard/dashboardMappings";
import type {
    LearningGoal,
    ProficiencyLevel,
    GoalTier,
    EnglishVariant,
    ReminderFrequency,
    NotificationChannel,
    OnboardingPayload,
} from "@/features/onboarding/types";

// ─── Editable option lists ──────────────────────────────────────────────────

const LEARNING_GOAL_OPTIONS: { value: LearningGoal; label: string }[] = Object.entries(learningGoalLabels).map(
    ([value, label]) => ({ value: value as LearningGoal, label }),
);

const PROFICIENCY_LEVEL_OPTIONS: { value: ProficiencyLevel; label: string }[] = Object.entries(
    proficiencyLevelLabels,
).map(([value, label]) => ({ value: value as ProficiencyLevel, label }));

const GOAL_TIER_OPTIONS: { value: GoalTier; label: string; minutes: number }[] = [
    { value: "casual", label: "Casual", minutes: 5 },
    { value: "regular", label: "Regular", minutes: 10 },
    { value: "serious", label: "Serious", minutes: 15 },
    { value: "intense", label: "Intense", minutes: 20 },
];

const REMINDER_FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
    { value: "daily", label: "Every day" },
    { value: "weekdays", label: "Weekdays only" },
    { value: "custom", label: "Custom" },
];

const TOPIC_OPTIONS = [
    "Conversations",
    "Career",
    "Travel",
    "Academic",
    "News",
    "Entertainment",
    "Health",
    "Technology",
];

const FOCUS_AREA_OPTIONS = [
    "Fluency",
    "Pronunciation",
    "Listening",
    "Vocabulary",
    "Grammar",
    "Speaking confidence",
];

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
    { value: "push", label: "Push notifications" },
    { value: "email", label: "Email" },
];

// ─── Read-only section list ─────────────────────────────────────────────────

const READ_ONLY_SECTIONS = [
    { title: "Theme", description: "Light interface.", icon: Moon },
    { title: "Language", description: "English interface.", icon: Languages },
    { title: "Support", description: "Help center and contact options.", icon: ShieldQuestion },
    { title: "About", description: "ASpeakSphere preview dashboard.", icon: CalendarDays },
];

// ─── Shared field components ────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <p className="mb-2 text-sm font-bold text-slate-700">{children}</p>;
}

function FieldWrapper({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1">{children}</div>;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { refreshUser } = useAuth();
    const { preferences, isLoading, error, updatePreferences } = useDashboard();
    // Phase M13 — accent metadata comes from the backend's AccentManager
    // via /api/accents (single source of truth). The active accent label is
    // shown live so the user sees the current value while editing.
    const { accents, accentLabel, hasAccent } = useAccent();

    const [displayName, setDisplayName] = useState("");
    const [learningGoal, setLearningGoal] = useState<LearningGoal>("career");
    const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel>("intermediate");
    const [levelConfidence, setLevelConfidence] = useState(true);
    const [goalTier, setGoalTier] = useState<GoalTier>("regular");
    const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(10);
    const [topics, setTopics] = useState<string[]>([]);
    const [focusAreas, setFocusAreas] = useState<string[]>([]);
    const [englishVariant, setEnglishVariant] = useState<EnglishVariant | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState<string>("");
    const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency | null>(null);
    const [channels, setChannels] = useState<NotificationChannel[]>([]);

    const [isSaving, setIsSaving] = useState(false);

    // Hydrate local form state once preferences are loaded
    useEffect(() => {
        if (!preferences) return;
        setDisplayName(preferences.display_name ?? "");
        setLearningGoal(preferences.learning_goal);
        setProficiencyLevel(preferences.proficiency_level);
        setLevelConfidence(preferences.level_confidence);
        setGoalTier(preferences.goal_tier);
        setDailyGoalMinutes(preferences.daily_goal_minutes);
        setTopics(preferences.topics ?? []);
        setFocusAreas(preferences.focus_areas ?? []);
        setEnglishVariant(preferences.english_variant ?? null);
        setNotificationsEnabled(preferences.notifications_enabled);
        setReminderTime(preferences.reminder_time ?? "");
        setReminderFrequency(preferences.reminder_frequency ?? null);
        setChannels(preferences.channels ?? []);
    }, [preferences]);

    // Sync daily_goal_minutes when goal tier changes
    const handleGoalTierChange = (tier: GoalTier) => {
        const match = GOAL_TIER_OPTIONS.find((o) => o.value === tier);
        setGoalTier(tier);
        if (match) setDailyGoalMinutes(match.minutes);
    };

    const toggleArrayItem = <T extends string>(
        array: T[],
        item: T,
        setter: (next: T[]) => void,
    ) => {
        setter(array.includes(item) ? array.filter((v) => v !== item) : [...array, item]);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        const payload: OnboardingPayload = {
            display_name: displayName.trim(),
            learning_goal: learningGoal,
            proficiency_level: proficiencyLevel,
            level_confidence: levelConfidence,
            daily_goal_minutes: dailyGoalMinutes as 5 | 10 | 15 | 20,
            goal_tier: goalTier,
            topics,
            focus_areas: focusAreas,
            english_variant: englishVariant,
            notifications_enabled: notificationsEnabled,
            reminder_time: reminderTime.trim() || null,
            reminder_frequency: reminderFrequency,
            channels,
        };

        const success = await updatePreferences(payload);
        setIsSaving(false);

        if (success) {
            await refreshUser();
            await showSuccessAlert({
                title: "Preferences Saved!",
                text: "Your preferences have been saved successfully.",
            });
        } else {
            await showErrorAlert({
                title: "Save Failed",
                text: "Unable to save your preferences. Please try again.",
            });
        }
    };

    const handleCancel = () => {
        if (!preferences) return;
        setDisplayName(preferences.display_name ?? "");
        setLearningGoal(preferences.learning_goal);
        setProficiencyLevel(preferences.proficiency_level);
        setLevelConfidence(preferences.level_confidence);
        setGoalTier(preferences.goal_tier);
        setDailyGoalMinutes(preferences.daily_goal_minutes);
        setTopics(preferences.topics ?? []);
        setFocusAreas(preferences.focus_areas ?? []);
        setEnglishVariant(preferences.english_variant ?? null);
        setNotificationsEnabled(preferences.notifications_enabled);
        setReminderTime(preferences.reminder_time ?? "");
        setReminderFrequency(preferences.reminder_frequency ?? null);
        setChannels(preferences.channels ?? []);
    };

    return (
        <DashboardLayout>
            {/* ── Hero header ─────────────────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" aria-hidden="true" />
                <div className="relative space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                        <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                        Settings
                    </div>
                    <div className="space-y-3">
                        <h1 className="max-w-2xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                            Manage your learning preferences.
                        </h1>
                        <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            Adjust your profile, daily goal, reminders, and interface options.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Loading skeleton ─────────────────────────────────────────── */}
            {isLoading && (
                <>
                    <LoadingSkeleton rows={4} />
                    <LoadingSkeleton rows={3} />
                </>
            )}

            {/* ── Context-level error (load failure) ──────────────────────── */}
            {!isLoading && error && (
                <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-bold text-red-700">Unable to load preferences</p>
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                </section>
            )}

            {/* ── Main editable form ───────────────────────────────────────── */}
            {!isLoading && !error && preferences && (
                <form onSubmit={handleSubmit} noValidate className="space-y-6">

                    {/* ── Section: Profile ──────────────────────────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <UserRound className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500">Profile</p>
                                <h2 className="text-base font-bold text-slate-900">Learner identity</h2>
                            </div>
                        </div>
                        <FieldWrapper>
                            <FieldLabel>Display name</FieldLabel>
                            <input
                                id="display-name"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                maxLength={40}
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="Your display name"
                            />
                        </FieldWrapper>
                    </section>

                    {/* ── Section: Learning Preferences ─────────────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Target className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500">Learning preferences</p>
                                <h2 className="text-base font-bold text-slate-900">Goal, level, and topics</h2>
                            </div>
                        </div>
                        <div className="space-y-5">
                            {/* Learning goal */}
                            <FieldWrapper>
                                <FieldLabel>Learning goal</FieldLabel>
                                <select
                                    id="learning-goal"
                                    value={learningGoal}
                                    onChange={(e) => setLearningGoal(e.target.value as LearningGoal)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                >
                                    {LEARNING_GOAL_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </FieldWrapper>

                            {/* Proficiency level */}
                            <FieldWrapper>
                                <FieldLabel>English proficiency level</FieldLabel>
                                <select
                                    id="proficiency-level"
                                    value={proficiencyLevel}
                                    onChange={(e) => setProficiencyLevel(e.target.value as ProficiencyLevel)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                >
                                    {PROFICIENCY_LEVEL_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </FieldWrapper>

                            {/* Level confidence */}
                            <FieldWrapper>
                                <FieldLabel>Level confidence</FieldLabel>
                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <input
                                        id="level-confidence"
                                        type="checkbox"
                                        checked={levelConfidence}
                                        onChange={(e) => setLevelConfidence(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        I am confident in my selected level
                                    </span>
                                </label>
                            </FieldWrapper>

                            {/* Topics */}
                            <FieldWrapper>
                                <FieldLabel>Topics of interest</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {TOPIC_OPTIONS.map((topic) => {
                                        const active = topics.includes(topic);
                                        return (
                                            <button
                                                key={topic}
                                                type="button"
                                                onClick={() => toggleArrayItem(topics, topic, setTopics)}
                                                aria-pressed={active}
                                                className={`rounded-full border px-4 py-2 text-xs font-bold transition hover:scale-[1.03] active:scale-95 ${active
                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300"
                                                    }`}
                                            >
                                                {topic}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FieldWrapper>

                            {/* Focus areas */}
                            <FieldWrapper>
                                <FieldLabel>Focus areas</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {FOCUS_AREA_OPTIONS.map((area) => {
                                        const active = focusAreas.includes(area);
                                        return (
                                            <button
                                                key={area}
                                                type="button"
                                                onClick={() => toggleArrayItem(focusAreas, area, setFocusAreas)}
                                                aria-pressed={active}
                                                className={`rounded-full border px-4 py-2 text-xs font-bold transition hover:scale-[1.03] active:scale-95 ${active
                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300"
                                                    }`}
                                            >
                                                {area}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FieldWrapper>
                        </div>
                    </section>

                    {/* ── Section: Daily Goal ───────────────────────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                <Flame className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500">Daily goal</p>
                                <h2 className="text-base font-bold text-slate-900">
                                    {dailyGoalMinutes} minutes per day
                                </h2>
                            </div>
                        </div>
                        <FieldWrapper>
                            <FieldLabel>Goal intensity</FieldLabel>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {GOAL_TIER_OPTIONS.map((tier) => {
                                    const active = goalTier === tier.value;
                                    return (
                                        <button
                                            key={tier.value}
                                            type="button"
                                            onClick={() => handleGoalTierChange(tier.value)}
                                            aria-pressed={active}
                                            className={`rounded-2xl border p-4 text-left transition hover:scale-[1.02] ${active
                                                ? "border-orange-400 bg-orange-50 text-orange-700"
                                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300"
                                                }`}
                                        >
                                            <p className="text-sm font-bold">{tier.label}</p>
                                            <p className="mt-1 text-xs text-slate-500">{tier.minutes} min / day</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </FieldWrapper>
                    </section>

                    {/* ── Section: English variant ──────────────────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Globe2 className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-500">Preferred English variant</p>
                                <h2 className="text-base font-bold text-slate-900">Accent & dialect</h2>
                            </div>
                            {/* Phase M13 — live indicator of the currently active accent.
                                Updates immediately when preferences are saved (no logout/restart). */}
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                Active: {hasAccent ? accentLabel : "Default"}
                            </span>
                        </div>
                        <FieldWrapper>
                            <FieldLabel>English variant</FieldLabel>
                            <select
                                id="english-variant"
                                value={englishVariant ?? ""}
                                onChange={(e) =>
                                    setEnglishVariant(e.target.value ? (e.target.value as EnglishVariant) : null)
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">No preference</option>
                                {/* Phase M13 — options are driven by the backend's
                                    AccentManager via /api/accents, so adding a new
                                    accent requires no frontend changes. */}
                                {accents.map((a) => (
                                    <option key={a.code} value={a.code}>{a.label}</option>
                                ))}
                            </select>
                        </FieldWrapper>
                    </section>

                    {/* ── Section: Reminders & Notifications ───────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Bell className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500">Notifications</p>
                                <h2 className="text-base font-bold text-slate-900">Reminders & channels</h2>
                            </div>
                        </div>
                        <div className="space-y-5">
                            {/* Enable notifications toggle */}
                            <FieldWrapper>
                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <input
                                        id="notifications-enabled"
                                        type="checkbox"
                                        checked={notificationsEnabled}
                                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        Enable daily practice reminders
                                    </span>
                                </label>
                            </FieldWrapper>

                            {notificationsEnabled && (
                                <>
                                    {/* Reminder time */}
                                    <FieldWrapper>
                                        <FieldLabel>Reminder time (HH:MM)</FieldLabel>
                                        <input
                                            id="reminder-time"
                                            type="time"
                                            value={reminderTime}
                                            onChange={(e) => setReminderTime(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </FieldWrapper>

                                    {/* Reminder frequency */}
                                    <FieldWrapper>
                                        <FieldLabel>Reminder frequency</FieldLabel>
                                        <select
                                            id="reminder-frequency"
                                            value={reminderFrequency ?? ""}
                                            onChange={(e) =>
                                                setReminderFrequency(
                                                    e.target.value ? (e.target.value as ReminderFrequency) : null,
                                                )
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">Select frequency</option>
                                            {REMINDER_FREQUENCY_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </FieldWrapper>

                                    {/* Channels */}
                                    <FieldWrapper>
                                        <FieldLabel>Notification channels</FieldLabel>
                                        <div className="space-y-2">
                                            {CHANNEL_OPTIONS.map((ch) => {
                                                const active = channels.includes(ch.value);
                                                return (
                                                    <label key={ch.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={active}
                                                            onChange={() =>
                                                                toggleArrayItem(channels, ch.value, setChannels)
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                            {ch.value === "email" ? (
                                                                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                                            ) : (
                                                                <Bell className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                                            )}
                                                            {ch.label}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </FieldWrapper>
                                </>
                            )}
                        </div>
                    </section>

                    {/* ── Read-only sections ────────────────────────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-slate-500">App preferences</p>
                                <h2 className="mt-1 text-base font-bold text-slate-900">Interface settings</h2>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400">
                                Read-only
                            </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {READ_ONLY_SECTIONS.map((section) => {
                                const Icon = section.icon;
                                return (
                                    <article key={section.title} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                                                <Icon className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-slate-700">{section.title}</h3>
                                                <p className="mt-1 text-sm leading-6 text-slate-400">{section.description}</p>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── Save / Cancel bar ─────────────────────────────────── */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-500">Account actions</p>
                                <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-900">Save your changes</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Your preferences are saved to your profile and take effect immediately.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                            Save changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>

                </form>
            )}
        </DashboardLayout>
    );
}
