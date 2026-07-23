"use client";

import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

import { DashboardLayout } from "../../../components/dashboard";
import { practiceCategories } from "../../../components/dashboard/mockData";
import { ConversationProvider } from "@/features/conversation/ConversationContext";
import { VoiceProvider } from "@/features/conversation/VoiceContext";
import type { PracticeType } from "@/features/conversation/types";
import { getLessonById } from "@/features/conversation/lessonsData";
import ConversationWorkspace from "@/components/conversation/ConversationWorkspace";
import ConversationHeader from "@/components/conversation/ConversationHeader";
import TutorPortrait from "@/components/conversation/TutorPortrait";
import AIResponseCard from "@/components/conversation/AIResponseCard";
import WelcomeConversation from "@/components/conversation/WelcomeConversation";
import ChatWindow from "@/components/conversation/ChatWindow";
import ConversationInput from "@/components/conversation/ConversationInput";
import ConversationSidebar from "@/components/conversation/ConversationSidebar";
import SessionControls from "@/components/conversation/SessionControls";
import ConversationComplete from "@/components/conversation/ConversationComplete";
import SpeakingScore from "@/components/conversation/SpeakingScore";
import ConversationTimeline from "@/components/conversation/ConversationTimeline";
import { useConversation } from "@/features/conversation/ConversationContext";

const VALID_PRACTICE_TYPES = new Set(
    practiceCategories.map((c) => c.practiceType)
);

/**
 * Inner content that relies on the conversation context.
 * Every component here is rendered INSIDE <ConversationProvider>, so all
 * useConversation() calls are valid. The header is sticky at the top and
 * the rest of the layout sits below it.
 *
 * Phase 1 — Focused Conversation Workspace:
 * The surrounding layout chrome is chosen here, based on `status`, because
 * `status` only exists inside ConversationContext. While a session is
 * active (`status === "active"`) the dashboard Sidebar/TopNavbar are
 * replaced by the chrome-free `ConversationWorkspace` so the conversation
 * occupies the full viewport; before a session starts and after it ends,
 * `DashboardLayout` is used exactly as before. Because this choice lives
 * inside the provider tree (not around it), ConversationProvider and
 * VoiceProvider stay mounted continuously across the switch — no state is
 * reset and no existing behaviour changes, only the surrounding chrome.
 */
function ConversationContent() {
    const { status, isCompleted } = useConversation();
    const isActive = status !== "idle";

    const Layout = status === "active" ? ConversationWorkspace : DashboardLayout;

    return (
        <Layout>
            <ConversationHeader />
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    {/* ── Tutor-focused premium column ──────────────────────────
                        Phase M14 Enhancement — the tutor (Emma) is now the primary
                        visual focus. The column flows top → bottom:
                          1. Tutor Area   — large portrait + AI status badge
                          2. AI Response  — premium latest-response card + voice controls
                          3. Transcript   — scrollable chat, with the unified
                                            mic + text + send input bar docked
                                            to it (welcome state OR live)
                          4. Controls     — restart / end session
                          5. Completion   — summary / rating / export (self-gated)

                        Phase 3 — Voice Interaction Redesign: the standalone
                        "Premium floating microphone" section that used to sit
                        here was removed. ConversationInput is now the single
                        interaction area for both typing and voice — it
                        already renders directly below the transcript inside
                        section 3, so no replacement section is needed. The
                        recording logic itself is untouched: ConversationInput
                        now consumes the exact same `useVoice()` state
                        (`voiceState`, `handleMicClick`, `recorderSeconds`,
                        `isRecorderSupported`) that PremiumMicrophone used to
                        expose on its own. */}
                    <div className="flex min-w-0 flex-col gap-6">
                        {/* 1 + 2 — Tutor Area + AI Response Card, fused into a
                            single premium hero panel so the portrait and the
                            latest response read as one cohesive focal unit. */}
                        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl shadow-slate-900/30 sm:p-8">
                            {/* Decorative glows (carried over from the original
                                TutorHero so the visual language stays consistent). */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl"
                            />
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl"
                            />

                            <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
                                {/* Tutor portrait — large Emma, primary visual focus. */}
                                <TutorPortrait className="flex-shrink-0" />

                                {/* AI Response Card — latest message + voice controls. */}
                                <AIResponseCard className="min-w-0 flex-1" />
                            </div>
                        </section>

                        {/* 3 — Transcript (welcome state OR live chat). */}
                        <section className="flex h-[50vh] min-h-[360px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/50">
                                {isActive ? <ChatWindow /> : <WelcomeConversation />}
                            </div>

                            {/* Sticky text input — only rendered while the session
                                is active. Preserved for keyboard / accessibility users
                                who prefer typing over voice. */}
                            {isActive && <ConversationInput />}
                        </section>

                        {/* 4 — Restart / End session controls. */}
                        <SessionControls />

                        {/* 5 — Completion experience — self-gates on isCompleted
                            so it renders nothing until the practice is done.
                            Composes the summary card, rating, export/copy, and
                            follow-up actions. */}
                        <ConversationComplete />
                    </div>

                    {/* ── Sidebar ────────────────────────────────────────────────
                        Stacks below the chat on tablet & mobile. The
                        `space-y-6` matches the grid's gap rhythm.

                        Phase 2 content cleanup — SpeakingScore and
                        ConversationTimeline are recap content: they now only
                        render once the session is completed (`isCompleted`),
                        instead of showing empty placeholders before/during
                        the conversation. VoiceMessageCard was removed
                        entirely — its playback controls duplicated
                        AIResponseCard, which is now the single playback
                        surface. No completion functionality changed; these
                        two cards render exactly as before once `isCompleted`
                        is true.

                        Phase 3 — Voice Interaction Redesign: VoiceConversationPanel
                        was removed entirely (no replacement card). Its only
                        unique content, the live waveform, is now shown inside
                        ConversationInput's recording state; its status badge
                        and hint copy were redundant with information shown
                        elsewhere (TutorPortrait's live-status badge). */}
                    <div className="min-w-0">
                        <div className="space-y-6">
                            {isCompleted && (
                                <>
                                    <SpeakingScore />
                                    <ConversationTimeline />
                                </>
                            )}
                            <ConversationSidebar />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default function ConversationPage() {
    const searchParams = useSearchParams();
    const practice = searchParams.get("practice");
    const isValid =
        practice !== null && VALID_PRACTICE_TYPES.has(practice);
    const practiceType = isValid ? (practice as PracticeType) : null;

    // Phase 9 — resolve the optional `lesson` search param (a stable catalog
    // id) into its title + objectives so Emma can teach that specific lesson.
    // When absent (free-form session) the lesson props stay null and the
    // original behaviour is preserved.
    const lessonId = searchParams.get("lesson");
    const lesson = lessonId ? getLessonById(lessonId) : undefined;

    // Phase 1 — Focused Conversation Workspace:
    // DashboardLayout no longer wraps this whole page unconditionally. The
    // valid-practice branch hands layout selection to <ConversationContent>,
    // which switches between DashboardLayout and ConversationWorkspace based
    // on `status` (read from ConversationContext). The invalid-practice
    // fallback has no session/status to react to, so it keeps using
    // DashboardLayout directly, exactly as before.
    return isValid ? (
        <ConversationProvider
            practiceType={practiceType}
            lessonId={lesson?.id ?? null}
            lessonTitle={lesson?.title ?? null}
            lessonObjectives={lesson?.objectives ?? null}
        >
            {/* Phase 11.5 — VoiceProvider wraps the conversation
                content so the TTS playback state (auto-play of the
                newest AI reply, play/pause/replay/mute) and the shared
                recording state machine are available to every consumer —
                today that's AIResponseCard (playback) and
                ConversationInput (recording/mic), per the Phase 2/3
                content cleanups. Must be nested inside ConversationProvider
                because it consumes useConversation() to watch the isTyping
                transition. */}
            <VoiceProvider>
                <ConversationContent />
            </VoiceProvider>
        </ConversationProvider>
    ) : (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <InvalidPracticeState />
            </div>
        </DashboardLayout>
    );
}

/**
 * Fallback shown when the `practice` search param is missing or invalid.
 */
function InvalidPracticeState() {
    return (
        <section className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
                <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    No practice mode selected
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    Choose a practice mode from the Practice page to start an
                    AI conversation session.
                </p>
            </div>
            <Link
                href="/dashboard/practice"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Practice
            </Link>
        </section>
    );
}
