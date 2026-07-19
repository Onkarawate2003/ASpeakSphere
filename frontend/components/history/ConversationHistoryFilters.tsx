"use client";

import type { HistoryFilter, HistorySort } from "./historyUtils";
import { PRACTICE_FILTERS, getPracticeLabel } from "./historyUtils";

/**
 * Filter + sort controls for the Conversation History list.
 *
 * - Filter: "All" plus one button per practice type (client-side).
 * - Sort: "Newest First" / "Oldest First" toggle (client-side).
 *
 * All controls are accessible: each filter/sort button is a real
 * `<button>` with an `aria-pressed` state and an `aria-label`, and the
 * two groups are wrapped in labelled regions for screen readers.
 */
type ConversationHistoryFiltersProps = {
    /** Currently active practice-type filter. */
    filter: HistoryFilter;
    /** Callback invoked when the learner picks a different filter. */
    onFilterChange: (filter: HistoryFilter) => void;
    /** Currently active sort order. */
    sort: HistorySort;
    /** Callback invoked when the learner picks a different sort order. */
    onSortChange: (sort: HistorySort) => void;
};

export default function ConversationHistoryFilters({
    filter,
    onFilterChange,
    sort,
    onSortChange,
}: ConversationHistoryFiltersProps) {
    return (
        <section
            className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            aria-label="Conversation history filters"
        >
            {/* Practice-type filter group */}
            <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Filter by practice type"
            >
                <FilterButton
                    label="All"
                    isActive={filter === "all"}
                    onClick={() => onFilterChange("all")}
                />
                {PRACTICE_FILTERS.map((practiceType) => (
                    <FilterButton
                        key={practiceType}
                        label={getPracticeLabel(practiceType)}
                        isActive={filter === practiceType}
                        onClick={() => onFilterChange(practiceType)}
                    />
                ))}
            </div>

            {/* Sort group */}
            <div
                className="flex items-center gap-2"
                role="group"
                aria-label="Sort conversations"
            >
                <SortButton
                    label="Newest First"
                    isActive={sort === "newest"}
                    onClick={() => onSortChange("newest")}
                />
                <SortButton
                    label="Oldest First"
                    isActive={sort === "oldest"}
                    onClick={() => onSortChange("oldest")}
                />
            </div>
        </section>
    );
}

/** A single accessible filter pill button. */
function FilterButton({
    label,
    isActive,
    onClick,
}: {
    label: string;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            aria-label={`Filter by ${label}`}
            className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
        >
            {label}
        </button>
    );
}

/** A single accessible sort toggle button. */
function SortButton({
    label,
    isActive,
    onClick,
}: {
    label: string;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            aria-label={`Sort: ${label}`}
            className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isActive
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
        >
            {label}
        </button>
    );
}
