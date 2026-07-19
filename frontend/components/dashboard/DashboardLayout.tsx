"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

type DashboardLayoutProps = {
    children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <main className="min-h-screen bg-[#EEF3FA] text-slate-900">
            <div className="flex min-h-screen">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <TopNavbar onMenuClick={() => setIsSidebarOpen(true)} />
                    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </section>
                </div>
            </div>
        </main>
    );
}
