"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useConversation } from "@/features/conversation/ConversationContext";
import {
    COPY_ERROR_MESSAGE,
    COPY_SUCCESS_MESSAGE,
    EXPORT_FILENAME,
} from "@/features/conversation/constants";
import { buildExportText } from "@/features/conversation/utils";

/**
 * Conversation export + copy actions.
 *
 * - "Export Conversation" generates a `conversation.txt` file in the
 *   browser and triggers a download (no backend).
 * - "Copy Conversation" copies the same text to the clipboard via
 *   `navigator.clipboard.writeText()` and shows a Sonner success toast.
 *
 * Both buttons are only rendered once the session is completed (the
 * parent gates visibility), but they also self-guard against an empty
 * transcript.
 */
export default function ConversationExport() {
    const { messages, practiceLabel, elapsedSeconds } = useConversation();

    const handleExport = () => {
        if (messages.length === 0) return;
        const text = buildExportText(messages, practiceLabel, elapsedSeconds);
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = EXPORT_FILENAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopy = async () => {
        if (messages.length === 0) return;
        const text = buildExportText(messages, practiceLabel, elapsedSeconds);
        try {
            await navigator.clipboard.writeText(text);
            toast.success(COPY_SUCCESS_MESSAGE);
        } catch {
            toast.error(COPY_ERROR_MESSAGE);
        }
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <button
                type="button"
                onClick={handleExport}
                disabled={messages.length === 0}
                aria-label="Export conversation as a text file"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
                <Download className="h-4 w-4" />
                Export Conversation
            </button>
            <button
                type="button"
                onClick={handleCopy}
                disabled={messages.length === 0}
                aria-label="Copy conversation to clipboard"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
                <Copy className="h-4 w-4" />
                Copy Conversation
            </button>
        </div>
    );
}
