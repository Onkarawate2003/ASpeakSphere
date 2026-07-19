"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import { dashboardSearchItems, profileMenuItems } from "./mockData";

type TopNavbarProps = {
    onMenuClick: () => void;
};

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
    const { user, logout } = useAuth();
    const [query, setQuery] = useState("");
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : "Learner";
    const profileInitial = user?.first_name?.charAt(0).toUpperCase() || "L";

    const handleLogout = () => {
        setShowProfile(false);
        logout();
        // Hard navigation to the landing page so the protected dashboard
        // route unmounts before its guard can redirect to /login.
        window.location.replace("/");
    };

    const searchResults = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return [];
        }

        return dashboardSearchItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery) || item.category.toLowerCase().includes(normalizedQuery)).slice(0, 6);
    }, [query]);

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/75 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                <div className="flex items-center gap-3 lg:hidden">
                    <button type="button" onClick={onMenuClick} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm" aria-label="Open dashboard menu">
                        <Menu className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-bold text-slate-900">ASpeakSphere</span>
                </div>

                <div className="relative hidden min-w-0 flex-1 md:block lg:max-w-md">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search lessons, practice modes, or goals"
                            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                            aria-label="Search dashboard"
                        />
                    </div>
                    {query ? (
                        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                            {searchResults.length ? (
                                searchResults.map((item) => (
                                    <Link key={`${item.category}-${item.label}`} href={item.href} onClick={() => setQuery("")} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-0 hover:bg-blue-50">
                                        <span className="font-bold text-slate-800">{item.label}</span>
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{item.category}</span>
                                    </Link>
                                ))
                            ) : (
                                <p className="px-4 py-5 text-sm font-semibold text-slate-500">No dashboard results found.</p>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowNotifications((current) => !current);
                                setShowProfile(false);
                            }}
                            className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                            aria-label="Open notifications"
                        >
                            <Bell className="h-5 w-5" aria-hidden="true" />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
                        </button>
                        {showNotifications ? (
                            <div className="absolute right-0 top-full z-40 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Notifications</p>
                                <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                                    <p className="text-sm font-bold text-slate-700">No notifications yet</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">Practice reminders and updates will appear here once you start a session.</p>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowProfile((current) => !current);
                                setShowNotifications(false);
                            }}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200"
                            aria-label="Open profile menu"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">{profileInitial}</div>
                            <div className="hidden text-left sm:block">
                                <p className="text-sm font-bold text-slate-900">{displayName}</p>
                                <p className="text-xs text-slate-500">Free preview</p>
                            </div>
                            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
                        </button>
                        {showProfile ? (
                            <div className="absolute right-0 top-full z-40 mt-3 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
                                {profileMenuItems.map((item) => {
                                    const Icon = item.icon;

                                    if (item.label === "Logout") {
                                        return (
                                            <button key={item.label} type="button" onClick={handleLogout} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                                                <Icon className="h-4 w-4" aria-hidden="true" />
                                                {item.label}
                                            </button>
                                        );
                                    }

                                    return (
                                        <Link key={item.label} href={item.href} onClick={() => setShowProfile(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
}
