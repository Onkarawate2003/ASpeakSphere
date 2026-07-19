import Link from "next/link";
import { Mic2, PlayCircle } from "lucide-react";

export default function PracticeCard() {
    return (
        <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-600/20">
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <Mic2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">AI ready</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em]">Speaking practice</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">Start with guided prompts today. Live AI conversation can plug into this card later.</p>
            <Link href="/dashboard/practice" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:scale-[1.02] active:scale-95">
                <PlayCircle className="h-5 w-5" aria-hidden="true" />
                Begin practice
            </Link>
        </section>
    );
}
