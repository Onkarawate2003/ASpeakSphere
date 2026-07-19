import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
    title: string;
    description: string;
    onRetry?: () => void;
};

export default function ErrorState({ title, description, onRetry }: ErrorStateProps) {
    return (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-rose-900 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                    <h3 className="text-base font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-rose-700">{description}</p>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

