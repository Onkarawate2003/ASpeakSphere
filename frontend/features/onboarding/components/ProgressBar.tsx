type ProgressBarProps = {
    currentStep: number;
    totalSteps: number;
    label?: string;
    optional?: boolean;
};

export default function ProgressBar({
    currentStep,
    totalSteps,
    label = "Onboarding progress",
    optional = false,
}: ProgressBarProps) {
    const safeTotal = Math.max(totalSteps, 1);
    const safeCurrent = Math.min(Math.max(currentStep, 0), safeTotal);
    const progress = Math.round((safeCurrent / safeTotal) * 100);

    return (
        <div className="w-full space-y-2" aria-label={label}>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{label}</span>
                <span>{optional ? "Optional" : `${safeCurrent}/${safeTotal}`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
