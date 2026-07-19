import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

type SocialLoginProps = {
  provider: "Google";
  icon: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export default function SocialLogin({
  provider,
  icon,
  onClick,
  loading = false,
  disabled = false,
}: SocialLoginProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      <span>{loading ? "Continuing with Google…" : `Continue with ${provider}`}</span>
    </button>
  );
}