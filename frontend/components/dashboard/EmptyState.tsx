import Link from "next/link";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
    title: string;
    description: string;
    actionLabel?: string;
    /**
     * Link-based navigation. Preferred for Server Components because
     * functions cannot cross the server→client boundary.
     */
    actionHref?: string;
    /**
     * Callback-based action. Only usable from Client Components.
     */
    onAction?: () => void;
};

export default function EmptyState({ title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Inbox className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-[-0.03em] text-slate-900">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
            {actionLabel && actionHref ? (
                <Link
                    href={actionHref}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] active:scale-95"
                >
                    {actionLabel}
                </Link>
            ) : onAction && actionLabel ? (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] active:scale-95"
                >
                    {actionLabel}
                </button>
            ) : null}
        </div>
    );
}
