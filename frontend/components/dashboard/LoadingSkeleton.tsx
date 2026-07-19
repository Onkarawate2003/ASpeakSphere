type LoadingSkeletonProps = {
    rows?: number;
};

export default function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Loading content">
            <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 space-y-3">
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
            </div>
        </div>
    );
}
