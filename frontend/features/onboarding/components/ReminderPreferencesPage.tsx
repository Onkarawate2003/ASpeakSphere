"use client";

import { Bell, Check, Clock3, Mail, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useOnboarding } from "../OnboardingContext";
import type { NotificationChannel, ReminderFrequency } from "../types";
import OnboardingNavigation from "./OnboardingNavigation";
import ProgressBar from "./ProgressBar";

type FrequencyOption = {
    label: string;
    value: ReminderFrequency;
    description: string;
};

type ChannelOption = {
    label: string;
    value: NotificationChannel;
    icon: LucideIcon;
};

const frequencyOptions: FrequencyOption[] = [
    {
        label: "Every day",
        value: "daily",
        description: "Build a consistent daily speaking habit.",
    },
    {
        label: "Weekdays",
        value: "weekdays",
        description: "Practice on your regular work or study days.",
    },
    {
        label: "Custom rhythm",
        value: "custom",
        description: "Keep reminders flexible for your routine.",
    },
];

const channelOptions: ChannelOption[] = [
    {
        label: "Push",
        value: "push",
        icon: Smartphone,
    },
    {
        label: "Email",
        value: "email",
        icon: Mail,
    },
];

export default function ReminderPreferencesPage() {
    const { data, updateField, goNext, goBack } = useOnboarding();
    const remindersEnabled = data.notificationsEnabled;
    const isValid = !remindersEnabled || Boolean(data.reminderTime && data.reminderFrequency && data.channels.length > 0);

    const handleReminderToggle = () => {
        const nextEnabled = !remindersEnabled;

        updateField("notificationsEnabled", nextEnabled);
        if (nextEnabled) {
            updateField("reminderTime", data.reminderTime ?? "18:00");
            updateField("reminderFrequency", data.reminderFrequency ?? "daily");
            updateField("channels", data.channels.length > 0 ? data.channels : ["push"]);
        } else {
            updateField("reminderTime", null);
            updateField("reminderFrequency", null);
            updateField("channels", []);
        }
    };

    const toggleChannel = (value: NotificationChannel) => {
        const nextChannels = data.channels.includes(value)
            ? data.channels.filter((channel) => channel !== value)
            : [...data.channels, value];

        updateField("channels", nextChannels);
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEF3FA] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-pink-200 to-blue-200 opacity-30 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-blue-100 to-green-100 opacity-40 blur-3xl" />
            </div>

            <section
                aria-labelledby="reminders-heading"
                className="w-full max-w-[760px] rounded-3xl border border-slate-200/70 bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out sm:px-10 sm:py-12"
            >
                <div className="mx-auto flex max-w-2xl flex-col gap-8">
                    <ProgressBar currentStep={10} totalSteps={11} label="Step 10 of 11" optional />

                    <div className="space-y-4 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Bell className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <h1 id="reminders-heading" className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl">
                            Set practice reminders?
                        </h1>
                        <p className="mx-auto max-w-[46ch] text-base leading-7 text-slate-600 sm:text-lg">
                            Reminders are optional, but they help keep your speaking habit alive.
                        </p>
                    </div>

                    <div className="space-y-5">
                        <button
                            type="button"
                            onClick={handleReminderToggle}
                            aria-pressed={remindersEnabled}
                            className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50/70 active:scale-[0.99] ${remindersEnabled
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-800"
                                }`}
                        >
                            <span>
                                <span className="block text-base font-bold">{remindersEnabled ? "Reminders enabled" : "Reminders disabled"}</span>
                                <span className="mt-1 block text-sm font-medium text-slate-500">
                                    {remindersEnabled ? "We will save your reminder preferences." : "You can continue without reminders."}
                                </span>
                            </span>
                            <span className={`flex h-8 w-14 items-center rounded-full p-1 transition ${remindersEnabled ? "bg-blue-600" : "bg-slate-200"}`}>
                                <span className={`h-6 w-6 rounded-full bg-white shadow-sm transition ${remindersEnabled ? "translate-x-6" : "translate-x-0"}`} />
                            </span>
                        </button>

                        {remindersEnabled ? (
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <label className="block text-sm font-semibold text-slate-700" htmlFor="reminder-time">
                                    Preferred reminder time
                                </label>
                                <div className="relative">
                                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                    <input
                                        id="reminder-time"
                                        type="time"
                                        value={data.reminderTime ?? "18:00"}
                                        onChange={(event) => updateField("reminderTime", event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <fieldset className="grid gap-3 sm:grid-cols-3" aria-label="Reminder frequency">
                                    <legend className="mb-2 text-sm font-semibold text-slate-700">Frequency</legend>
                                    {frequencyOptions.map((option) => {
                                        const selected = data.reminderFrequency === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateField("reminderFrequency", option.value)}
                                                aria-pressed={selected}
                                                className={`rounded-2xl border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                                            >
                                                <span className="block text-sm font-bold">{option.label}</span>
                                                <span className="mt-1 block text-xs font-medium text-slate-500">{option.description}</span>
                                            </button>
                                        );
                                    })}
                                </fieldset>

                                <fieldset className="grid gap-3 sm:grid-cols-2" aria-label="Reminder channels">
                                    <legend className="mb-2 text-sm font-semibold text-slate-700">Channels</legend>
                                    {channelOptions.map((option) => {
                                        const selected = data.channels.includes(option.value);
                                        const Icon = option.icon;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => toggleChannel(option.value)}
                                                aria-pressed={selected}
                                                className={`flex items-center justify-between rounded-2xl border p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                                            >
                                                <span className="flex items-center gap-3 text-sm font-bold">
                                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                                    {option.label}
                                                </span>
                                                <Check className={`h-4 w-4 ${selected ? "text-blue-600" : "text-transparent"}`} aria-hidden="true" />
                                            </button>
                                        );
                                    })}
                                </fieldset>
                            </div>
                        ) : null}
                    </div>

                    <OnboardingNavigation onBack={goBack} onNext={goNext} nextDisabled={!isValid} backLabel="Back" nextLabel="Continue" />
                </div>
            </section>
        </main>
    );
}
