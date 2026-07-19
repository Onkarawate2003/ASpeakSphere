import { ArrowLeft, ArrowRight } from "lucide-react";

export type OnboardingNavigationProps = {
    onNext?: () => void;
    onBack?: () => void;
    onSkip?: () => void;
    nextLabel?: string;
    backLabel?: string;
    skipLabel?: string;
    showBack?: boolean;
    showSkip?: boolean;
    nextDisabled?: boolean;
    loading?: boolean;
};

export default function OnboardingNavigation({
    onNext,
    onBack,
    onSkip,
    nextLabel = "Continue",
    backLabel = "Back",
    skipLabel = "Skip",
    showBack = true,
    showSkip = false,
    nextDisabled = false,
    loading = false,
}: OnboardingNavigationProps) {
    return (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                {showBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {backLabel}
                    </button>
                ) : null}

                {showSkip ? (
                    <button
                        type="button"
                        onClick={onSkip}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-blue-700 active:scale-95"
                    >
                        {skipLabel}
                    </button>
                ) : null}
            </div>

            <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || loading}
                aria-busy={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36"
            >
                {loading ? "Saving..." : nextLabel}
                <ArrowRight className="h-4 w-4" />
            </button>
        </div>
    );
}
