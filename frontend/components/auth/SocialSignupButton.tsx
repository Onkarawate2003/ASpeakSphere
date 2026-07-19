import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import React, { Fragment, type ReactNode } from "react";

type Props = {
  label: string;
  icon?: LucideIcon | ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function SocialSignupButton({
  label,
  icon,
  onClick,
  variant = "primary",
  loading = false,
  disabled = false,
  ariaLabel,
}: Props) {
  const isPrimary = variant === "primary";

  const base = `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform duration-150 ease-out shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400`;

  const primaryStyles = `bg-blue-600 text-white hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`;
  const secondaryStyles = `bg-white/80 text-slate-900 border border-slate-200 hover:scale-[1.02] hover:shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`;

  const IconNode = () => {
    if (!icon) return null;
    // If it's already a React element, clone it to apply classes
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, {
        ...( { className: isPrimary ? "h-5 w-5 text-white" : "h-5 w-5 text-slate-700" } as any ),
      } as any);
    }

    // Otherwise assume it's a component and render it
    const Comp = icon as any;
    return <Comp className={isPrimary ? "h-5 w-5 text-white" : "h-5 w-5 text-slate-700"} />;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${isPrimary ? primaryStyles : secondaryStyles}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <IconNode />}
      </span>

      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}
