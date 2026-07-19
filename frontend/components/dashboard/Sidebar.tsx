"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Sparkles, X } from "lucide-react";

import { dashboardNavItems } from "./mockData";

type SidebarProps = {
    isOpen?: boolean;
    onClose?: () => void;
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();

    const sidebarContent = (
        <div className="flex h-full flex-col justify-between">
            <div className="space-y-8">
                <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-900 p-4 text-white shadow-xl shadow-slate-900/15">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500">
                            <GraduationCap className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">ASpeakSphere</p>
                            <p className="text-xs text-slate-300">AI speaking studio</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close dashboard menu">
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <nav className="space-y-2" aria-label="Dashboard navigation">
                    {dashboardNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-700 ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-600 hover:text-white" : "text-slate-600"}`}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <Sparkles className="h-6 w-6 text-blue-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-900">Premium onboarding active</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Your dashboard is prepared for upcoming AI speaking modules.</p>
            </div>
        </div>
    );

    return (
        <>
            <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl lg:block">
                {sidebarContent}
            </aside>
            <div className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} aria-hidden="true" />
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] border-r border-slate-200/80 bg-white p-5 shadow-2xl transition duration-300 lg:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {sidebarContent}
            </aside>
        </>
    );
}
