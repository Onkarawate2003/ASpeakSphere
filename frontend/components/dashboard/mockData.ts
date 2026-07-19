import type { LucideIcon } from "lucide-react";
import {
    BarChart3,
    BookOpen,
    GraduationCap,
    Headphones,
    HelpCircle,
    History,
    Home,
    Lock,
    Mic2,
    Settings,
    UserRound,
    Volume2,
} from "lucide-react";

export type DashboardNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

export type SearchItem = {
    label: string;
    href: string;
    category: string;
};

export type PracticeCategory = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    tone: string;
    /** Stable lowercase identifier used as the `practice` URL search param. */
    practiceType: string;
};

// ─── Navigation ──────────────────────────────────────────────────────────────

export const dashboardNavItems: DashboardNavItem[] = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Practice", href: "/dashboard/practice", icon: Mic2 },
    { label: "History", href: "/dashboard/history", icon: History },
    { label: "Statistics", href: "/dashboard/stats", icon: BarChart3 },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ─── Search ──────────────────────────────────────────────────────────────────

export const dashboardSearchItems: SearchItem[] = [
    ...dashboardNavItems.map((item) => ({ label: item.label, href: item.href, category: "Page" })),
    { label: "Speaking Practice", href: "/dashboard/practice", category: "Practice" },
    { label: "Listening Practice", href: "/dashboard/practice", category: "Practice" },
    { label: "Vocabulary Practice", href: "/dashboard/practice", category: "Practice" },
    { label: "Grammar Practice", href: "/dashboard/practice", category: "Practice" },
    { label: "Pronunciation Practice", href: "/dashboard/practice", category: "Practice" },
];

// ─── Profile menu ────────────────────────────────────────────────────────────

export const profileMenuItems = [
    { label: "Profile", href: "/dashboard/settings", icon: UserRound },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
    { label: "Help", href: "/dashboard/settings", icon: HelpCircle },
    { label: "Logout", href: "/", icon: Lock },
];

// ─── Practice modes (active entry points for the AI Conversation module) ─────

export const practiceCategories: PracticeCategory[] = [
    { title: "Speaking Practice", description: "Answer guided prompts out loud.", href: "/dashboard/practice", icon: Mic2, tone: "from-blue-600 to-indigo-700", practiceType: "speaking" },
    { title: "Listening Practice", description: "Train comprehension with short clips.", href: "/dashboard/practice", icon: Headphones, tone: "from-emerald-500 to-teal-700", practiceType: "listening" },
    { title: "Vocabulary Practice", description: "Review phrases for real situations.", href: "/dashboard/practice", icon: BookOpen, tone: "from-amber-500 to-orange-700", practiceType: "vocabulary" },
    { title: "Grammar Practice", description: "Fix common speaking mistakes.", href: "/dashboard/practice", icon: GraduationCap, tone: "from-violet-500 to-purple-700", practiceType: "grammar" },
    { title: "Pronunciation Practice", description: "Improve clarity, rhythm, and stress.", href: "/dashboard/practice", icon: Volume2, tone: "from-pink-500 to-rose-700", practiceType: "pronunciation" },
];
