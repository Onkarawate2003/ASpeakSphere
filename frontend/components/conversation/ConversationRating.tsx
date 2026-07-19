"use client";

import { useState } from "react";
import { Star } from "lucide-react";

/**
 * Conversation rating widget.
 *
 * Lets the user rate the session from 1 to 5 stars. The selected value is
 * stored only in React local state (no backend). Fully keyboard
 * accessible: each star is a focusable button (Tab to move between them,
 * Enter/Space to confirm), hover/focus updates the highlight, and the
 * current label is announced via an aria-live region.
 *
 * @example
 *   <ConversationRating />
 */
export default function ConversationRating() {
    const [rating, setRating] = useState<number>(0);
    const [hover, setHover] = useState<number>(0);

    const display = hover || rating;

    const label =
        display === 0
            ? "Tap a star to rate"
            : display === 1
                ? "Poor"
                : display === 2
                    ? "Fair"
                    : display === 3
                        ? "Good"
                        : display === 4
                            ? "Very Good"
                            : "Excellent";

    return (
        <div
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            role="group"
            aria-label="Rate this conversation"
        >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Rate this session
            </p>
            <div
                className="flex items-center gap-1.5"
                role="radiogroup"
                aria-label="Rating from 1 to 5 stars"
            >
                {[1, 2, 3, 4, 5].map((value) => {
                    const isFilled = value <= display;
                    return (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={rating === value}
                            aria-label={`${value} star${value > 1 ? "s" : ""}`}
                            onClick={() => setRating(value)}
                            onMouseEnter={() => setHover(value)}
                            onMouseLeave={() => setHover(0)}
                            onFocus={() => setHover(value)}
                            onBlur={() => setHover(0)}
                            className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                            <Star
                                className={`h-7 w-7 transition-colors ${isFilled
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-transparent text-slate-300"
                                    }`}
                                strokeWidth={1.75}
                            />
                        </button>
                    );
                })}
            </div>
            <p
                className="mt-2 text-sm font-bold text-slate-600"
                aria-live="polite"
            >
                {label}
            </p>
        </div>
    );
}
