import { Sparkles } from "lucide-react";

type ComingSoonCardProps = {
    title: string;
    description: string;
};

export default function ComingSoonCard({ title, description }: ComingSoonCardProps) {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white shadow-xl shadow-blue-950/20">
            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
            <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Coming soon</p>
                <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </div>
        </section>
    );
}
