"use client";

import { useMemo } from "react";
import { User } from "lucide-react";
import type { ConversationMessage } from "@/features/conversation/types";
import { TUTOR_NAME } from "@/features/conversation/constants";
import { useOptionalVoice } from "@/features/conversation/VoiceContext";
import type { AvatarState } from "@/features/conversation/useAvatarState";
import AnimatedTutorAvatar from "./AnimatedTutorAvatar";

type ChatBubbleProps = {
    message: ConversationMessage;
    /**
     * Phase 4 — message grouping (derived entirely from the existing
     * `messages` array by `ChatWindow`; no change to `ConversationMessage`
     * or `ConversationContext`). True when this is the first message in a
     * consecutive run from the same sender — controls the AI name label.
     * Defaults to `true` so any other usage renders exactly as before.
     */
    isFirstInGroup?: boolean;
    /**
     * True when this is the last message in a consecutive run from the same
     * sender — controls the avatar and timestamp. Defaults to `true`.
     */
    isLastInGroup?: boolean;
};

/** Matches a plain-text numbered list item, e.g. "1. " or "2) ". */
const NUMBERED_ITEM = /^\d+[.)]\s+/;
/** Matches a plain-text bullet list item, e.g. "- ", "* ", "• ". */
const BULLET_ITEM = /^[-*•]\s+/;

/**
 * Split message content into paragraph blocks on blank-line breaks,
 * preserving single line breaks within each block exactly as before
 * (still rendered with `whitespace-pre-line`). Purely a rendering-time
 * transformation — `message.content` itself is never modified.
 */
function splitIntoBlocks(content: string): string[] {
    return content
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);
}

/**
 * Render a single content block as a numbered list, bullet list, or plain
 * paragraph, based on whether every non-empty line already matches a
 * simple plain-text list pattern. This recognizes structure the AI reply
 * already expresses in plain text (e.g. "1. ...", "- ...") — it does not
 * parse markdown or any other markup.
 */
function renderBlock(block: string, key: number) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);

    if (lines.length > 1 && lines.every((line) => NUMBERED_ITEM.test(line))) {
        return (
            <ol key={key} className="list-decimal space-y-1 pl-5">
                {lines.map((line, index) => (
                    <li key={index} className="break-words">
                        {line.replace(NUMBERED_ITEM, "")}
                    </li>
                ))}
            </ol>
        );
    }

    if (lines.length > 1 && lines.every((line) => BULLET_ITEM.test(line))) {
        return (
            <ul key={key} className="list-disc space-y-1 pl-5">
                {lines.map((line, index) => (
                    <li key={index} className="break-words">
                        {line.replace(BULLET_ITEM, "")}
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <p key={key} className="whitespace-pre-line break-words">
            {block}
        </p>
    );
}

/**
 * Format plain-text message content for readability: paragraph blocks get
 * visible spacing between them, and blocks that are already structured as
 * a plain-text numbered/bulleted list render as a real list instead of
 * wrapped prose. Single-block messages (the common case) render exactly
 * as before — same `<p>`, same `whitespace-pre-line` — so this is a
 * strict enhancement, not a behavior change, for ordinary short replies.
 */
function formatMessageContent(content: string) {
    const blocks = splitIntoBlocks(content);
    if (blocks.length <= 1) {
        return (
            <p className="whitespace-pre-line break-words">{content}</p>
        );
    }
    return (
        <div className="space-y-2">
            {blocks.map((block, index) => renderBlock(block, index))}
        </div>
    );
}

/**
 * A single chat message bubble.
 *
 * Layout & polish (Phase 2):
 * - AI messages: left-aligned, white card, branded TutorAvatar.
 * - User messages: right-aligned, blue bubble, user avatar.
 * - Bubbles size to their content and wrap naturally.
 * - Generous internal padding, larger border radius, and a clear typography
 *   hierarchy (tutor name label + body) make the transcript easy to read.
 *
 * Phase 4 — Premium transcript polish:
 * - Message grouping: `isFirstInGroup`/`isLastInGroup` (computed by
 *   `ChatWindow` from the existing `messages` array) control the AI name
 *   label, the avatar, and the timestamp so consecutive turns from the
 *   same sender read as one continuous group instead of repeating the
 *   sender's identity on every line. When an avatar is hidden (not the
 *   group's anchor message), an invisible same-sized spacer keeps the
 *   bubble's horizontal position identical, so grouped messages stay
 *   perfectly aligned.
 * - Bubble width now caps at a fixed pixel maximum in addition to the
 *   existing percentage (`max-w-[min(75%,38rem)]` / `max-w-[min(65%,30rem)]`)
 *   so long AI replies never stretch to uncomfortable line lengths on
 *   large monitors — the percentage alone still governs on narrower
 *   viewports exactly as before, since it is always the smaller value there.
 * - Long message formatting (`formatMessageContent`) adds visible spacing
 *   between paragraph blocks and renders plain-text numbered/bulleted
 *   lines as real lists — the message content itself is never modified,
 *   only how it's rendered.
 * - Bubble color, radius, alignment, typography, and the entrance
 *   animation are all unchanged.
 */
export default function ChatBubble({
    message,
    isFirstInGroup = true,
    isLastInGroup = true,
}: ChatBubbleProps) {
    const isAI = message.role === "ai";
    // useOptionalVoice returns null when there is no VoiceProvider in the tree
    // (e.g. read-only history pages). Phase 2 content cleanup: the
    // playback-control button previously here was removed — AIResponseCard
    // is now the single playback-control surface for the app. This
    // component still reads playback state so the per-message avatar stays
    // speech-synced to whichever AI message is actually playing.
    const voice = useOptionalVoice();
    const playbackState = voice?.playbackState ?? "idle";
    const activeMessageId = voice?.activeMessageId ?? null;

    // Whether this specific AI message is the one currently loaded/playing.
    const isActiveMessage = isAI && activeMessageId === message.id;
    const isThisPlaying = isActiveMessage && playbackState === "playing";
    const isThisPaused = isActiveMessage && playbackState === "paused";

    // Phase M14 — per-message avatar state. The small avatar in each AI
    // bubble animates its mouth only while THIS message's audio is playing,
    // holds while paused, and breathes gently otherwise. This is the
    // speech-synced per-message counterpart to the hero avatar.
    const avatarState: AvatarState = isThisPlaying
        ? "speaking"
        : isThisPaused
            ? "paused"
            : isActiveMessage && playbackState === "loading"
                ? "loading"
                : "idle";

    // Phase 4 — memoized so re-parsing only happens if the message content
    // itself changes (it never does after a message is created), not on
    // every re-render triggered by avatar/playback state ticking.
    const formattedContent = useMemo(
        () => formatMessageContent(message.content),
        [message.content],
    );

    return (
        <div
            className={`spk-bubble-enter flex w-full items-end gap-2.5 sm:gap-3 ${isAI ? "justify-start" : "flex-row-reverse justify-start"
                }`}
        >
            {/* Avatar column — shown only on the group's anchor message
                (isLastInGroup) so a consecutive run from the same sender
                shows one avatar, not one per line. A same-sized invisible
                spacer keeps every bubble in the group at the same
                horizontal offset when the avatar itself is hidden. */}
            {isLastInGroup ? (
                isAI ? (
                    <AnimatedTutorAvatar state={avatarState} size="sm" />
                ) : (
                    <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow-sm ring-1 ring-inset ring-white/40"
                        aria-hidden="true"
                    >
                        <User className="h-4 w-4" />
                    </div>
                )
            ) : (
                <div className="h-9 w-9 flex-shrink-0" aria-hidden="true" />
            )}

            {/* Bubble + timestamp */}
            <div
                className={`flex flex-col gap-1 ${isAI ? "max-w-[min(75%,38rem)] items-start" : "max-w-[min(65%,30rem)] items-end"
                    }`}
            >
                <div
                    className={`rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed shadow-sm transition-colors sm:px-5 sm:py-3.5 ${isAI
                        ? "rounded-bl-md border border-slate-200/80 bg-white text-slate-800"
                        : "rounded-br-md bg-blue-600 text-white"
                        }`}
                >
                    {isAI && isFirstInGroup && (
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-blue-600">
                            {TUTOR_NAME}
                        </p>
                    )}
                    {formattedContent}
                </div>
                {isLastInGroup && (
                    <span className="px-1 text-[11px] font-medium text-slate-400">
                        {message.timestamp}
                    </span>
                )}
            </div>
        </div>
    );
}
