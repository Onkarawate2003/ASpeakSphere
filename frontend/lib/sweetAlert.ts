import Swal, { type SweetAlertOptions, type SweetAlertResult } from "sweetalert2";

/**
 * SpeakSphere SweetAlert2 theme.
 *
 * A small, reusable wrapper around SweetAlert2 that applies the dashboard
 * design system (blue-600 accent, rounded cards, soft shadows, modern
 * typography, smooth fade+scale animations and dark-mode support) so every
 * popup across the app looks consistent.
 *
 * Usage:
 *   import { showSuccessAlert, showErrorAlert, showConfirmationAlert } from "@/lib/sweetAlert";
 *   await showSuccessAlert({ title: "Saved!", text: "Your changes were saved." });
 */

// ─── SpeakSphere design tokens ───────────────────────────────────────────────

const TOKENS = {
    primary: "#2563eb", // blue-600
    primaryHover: "#1d4ed8", // blue-700
    success: "#16a34a", // green-600
    error: "#dc2626", // red-600
    title: "#0f172a", // slate-900
    text: "#64748b", // slate-500
    card: "#ffffff",
    cardBorder: "rgba(226, 232, 240, 0.7)", // slate-200 @ 70%
    cancelBg: "#f1f5f9", // slate-100
    cancelText: "#475569", // slate-600
    cancelBorder: "#e2e8f0", // slate-200
    // Dark mode
    darkCard: "#0f172a", // slate-900
    darkTitle: "#f1f5f9", // slate-100
    darkText: "#94a3b8", // slate-400
    darkCancelBg: "#1e293b", // slate-800
    darkCancelText: "#cbd5e1", // slate-300
    darkCancelBorder: "#334155", // slate-700
} as const;

// ─── One-time CSS injection ──────────────────────────────────────────────────

const STYLE_ID = "spk-swal-theme";

function injectThemeStyles(): void {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
/* ── Popup card ─────────────────────────────────────────────── */
.swal2-popup.spk-popup {
    border-radius: 20px;
    background: ${TOKENS.card};
    border: 1px solid ${TOKENS.cardBorder};
    box-shadow:
        0 24px 60px -15px rgba(15, 23, 42, 0.28),
        0 8px 24px -8px rgba(15, 23, 42, 0.12);
    padding: 2.5rem 2.25rem 2.25rem;
    font-family: inherit;
}

/* ── Title ──────────────────────────────────────────────────── */
.spk-popup .swal2-title {
    color: ${TOKENS.title};
    font-weight: 800;
    letter-spacing: -0.03em;
    font-size: 1.5rem;
    line-height: 1.25;
    margin: 0 0 0.5rem;
    padding: 0;
}

/* ── Body text ──────────────────────────────────────────────── */
.spk-popup .swal2-html-container {
    color: ${TOKENS.text};
    font-size: 0.95rem;
    line-height: 1.6;
    font-weight: 400;
    margin: 0;
}

/* ── Icon (slightly larger + on-brand colors) ───────────────── */
.spk-popup .swal2-icon {
    transform: scale(1.18);
    margin: 0 auto 1.5rem;
}
.spk-popup .swal2-icon.swal2-success {
    border-color: ${TOKENS.success};
    color: ${TOKENS.success};
}
.spk-popup .swal2-icon.swal2-success [class^="swal2-success-line"] {
    background-color: ${TOKENS.success};
}
.spk-popup .swal2-icon.swal2-success .swal2-success-ring {
    border-color: rgba(22, 163, 74, 0.25);
}
.spk-popup .swal2-icon.swal2-error {
    border-color: ${TOKENS.error};
    color: ${TOKENS.error};
}
.spk-popup .swal2-icon.swal2-error [class^="swal2-x-mark-line"] {
    background-color: ${TOKENS.error};
}
.spk-popup .swal2-icon.swal2-question,
.spk-popup .swal2-icon.swal2-info,
.spk-popup .swal2-icon.swal2-warning {
    border-color: ${TOKENS.primary};
    color: ${TOKENS.primary};
}

/* ── Confirm button ─────────────────────────────────────────── */
.spk-popup .swal2-confirm.spk-confirm {
    background-color: ${TOKENS.primary};
    color: #ffffff;
    border: none;
    border-radius: 16px;
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: -0.01em;
    padding: 0.8rem 2.25rem;
    box-shadow: 0 10px 20px -6px rgba(37, 99, 235, 0.45);
    transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
}
.spk-popup .swal2-confirm.spk-confirm:hover {
    background-color: ${TOKENS.primaryHover};
    transform: scale(1.03);
    box-shadow: 0 14px 26px -6px rgba(37, 99, 235, 0.55);
}
.spk-popup .swal2-confirm.spk-confirm:active {
    transform: scale(0.98);
}
.spk-popup .swal2-confirm.spk-confirm:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25), 0 10px 20px -6px rgba(37, 99, 235, 0.45);
}

/* ── Cancel button ──────────────────────────────────────────── */
.spk-popup .swal2-cancel.spk-cancel {
    background-color: ${TOKENS.cancelBg};
    color: ${TOKENS.cancelText};
    border: 1px solid ${TOKENS.cancelBorder};
    border-radius: 16px;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.8rem 2rem;
    box-shadow: none;
    transition: background-color 0.2s ease, transform 0.2s ease;
    cursor: pointer;
}
.spk-popup .swal2-cancel.spk-cancel:hover {
    background-color: ${TOKENS.cancelBorder};
    transform: scale(1.02);
}
.spk-popup .swal2-cancel.spk-cancel:active {
    transform: scale(0.98);
}

/* ── Button row spacing ─────────────────────────────────────── */
.spk-popup .swal2-actions {
    gap: 0.75rem;
    margin-top: 1.75rem;
}

/* ── Backdrop ───────────────────────────────────────────────── */
.swal2-container.spk-backdrop {
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
}

/* ── Animations: fade in + slight scale / fade out ──────────── */
@keyframes spk-show {
    0% { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
}
@keyframes spk-hide {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.96); }
}
.spk-show { animation: spk-show 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
.spk-hide { animation: spk-hide 0.22s ease forwards; }

/* ── Dark mode ──────────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
    .swal2-popup.spk-popup {
        background: ${TOKENS.darkCard};
        border-color: rgba(51, 65, 85, 0.6);
        box-shadow:
            0 24px 60px -15px rgba(0, 0, 0, 0.6),
            0 8px 24px -8px rgba(0, 0, 0, 0.4);
    }
    .spk-popup .swal2-title { color: ${TOKENS.darkTitle}; }
    .spk-popup .swal2-html-container { color: ${TOKENS.darkText}; }
    .spk-popup .swal2-cancel.spk-cancel {
        background-color: ${TOKENS.darkCancelBg};
        color: ${TOKENS.darkCancelText};
        border-color: ${TOKENS.darkCancelBorder};
    }
    .spk-popup .swal2-cancel.spk-cancel:hover {
        background-color: ${TOKENS.darkCancelBorder};
    }
}
`;
    document.head.appendChild(style);
}

// ─── Shared base configuration ───────────────────────────────────────────────

const baseOptions: SweetAlertOptions = {
    buttonsStyling: false,
    customClass: {
        container: "spk-backdrop",
        popup: "spk-popup",
        confirmButton: "spk-confirm",
        cancelButton: "spk-cancel",
    },
    showClass: { popup: "spk-show" },
    hideClass: { popup: "spk-hide" },
    allowOutsideClick: false,
    allowEscapeKey: true,
};

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Show a themed success popup.
 * Defaults: icon "success", confirm button "Continue", outside-click disabled.
 */
export async function showSuccessAlert(
    options?: Omit<SweetAlertOptions, "icon">,
): Promise<SweetAlertResult> {
    injectThemeStyles();
    return Swal.fire({
        ...baseOptions,
        ...options,
        icon: "success",
        confirmButtonText: options?.confirmButtonText ?? "Continue",
    } as SweetAlertOptions);
}

/**
 * Show a themed error popup.
 * Defaults: icon "error", confirm button "OK".
 */
export async function showErrorAlert(
    options?: Omit<SweetAlertOptions, "icon">,
): Promise<SweetAlertResult> {
    injectThemeStyles();
    return Swal.fire({
        ...baseOptions,
        ...options,
        icon: "error",
        confirmButtonText: options?.confirmButtonText ?? "OK",
    } as SweetAlertOptions);
}

/**
 * Show a themed confirmation popup with Confirm / Cancel buttons.
 * Defaults: icon "question", confirm "Confirm", cancel "Cancel".
 * Resolves with `result.isConfirmed === true` when the user confirms.
 */
export async function showConfirmationAlert(
    options?: Omit<SweetAlertOptions, "icon" | "showCancelButton">,
): Promise<SweetAlertResult> {
    injectThemeStyles();
    return Swal.fire({
        ...baseOptions,
        showCancelButton: true,
        ...options,
        icon: "question",
        confirmButtonText: options?.confirmButtonText ?? "Confirm",
        cancelButtonText: options?.cancelButtonText ?? "Cancel",
    } as SweetAlertOptions);
}
