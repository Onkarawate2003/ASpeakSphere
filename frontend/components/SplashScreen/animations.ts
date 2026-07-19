import type { Easing, Variants } from "framer-motion";

/**
 * Splash screen timeline, in milliseconds.
 * This is the single source of truth for timing — the component only
 * reads these constants, it never hardcodes a duration inline.
 *
 *   0ms ───────────────────────────────────────────────────────────────► 2350ms
 *   │ glow appears │ logo fades+scales in │ logo breathes (x2) │ title │ subtitle │ hold │ fade out │
 */

/** Step 3 — logo fade (0 → 1 opacity) + scale (0.85 → 1), easeOut. */
const LOGO_REVEAL_MS = 700;

/** Step 4/5 — one breathing cycle (scale 1 → 1.03 → 1), glow pulses in sync. */
const BREATHE_CYCLE_MS = 450;

/** Step 5 — "pulse 2-3 times"; 2 keeps the motion calm rather than busy. */
const BREATHE_COUNT = 2;

const LOGO_TOTAL_MS = LOGO_REVEAL_MS + BREATHE_CYCLE_MS * BREATHE_COUNT;

/** Step 6 — application name fades in + rises slightly. */
const TITLE_DELAY_MS = 950;
const TITLE_DURATION_MS = 400;

/** Step 7 — subtitle, ~200ms after the title starts. */
const SUBTITLE_DELAY_MS = TITLE_DELAY_MS + 200;
const SUBTITLE_DURATION_MS = 400;

/** Step 8 — everything stays visible for a beat once the subtitle lands. */
const HOLD_MS = 500;

/** Step 9 — whole screen fades out. */
const FADE_OUT_MS = 300;

const HOLD_UNTIL_MS = SUBTITLE_DELAY_MS + SUBTITLE_DURATION_MS + HOLD_MS;

export const SPLASH_TIMING = {
  logoTotalMs: LOGO_TOTAL_MS,
  titleDelayMs: TITLE_DELAY_MS,
  titleDurationMs: TITLE_DURATION_MS,
  subtitleDelayMs: SUBTITLE_DELAY_MS,
  subtitleDurationMs: SUBTITLE_DURATION_MS,
  /** When the fade-out (Step 9) should begin. */
  holdUntilMs: HOLD_UNTIL_MS,
  fadeOutMs: FADE_OUT_MS,
} as const;

/** Total splash lifetime, from mount to `onComplete`. */
export const SPLASH_TOTAL_DURATION_MS = HOLD_UNTIL_MS + FADE_OUT_MS;

const ms = (value: number) => value / 1000;

// Keyframe checkpoints (as fractions of LOGO_TOTAL_MS) shared by the logo
// and its glow so the two stay perfectly synchronized:
//   reveal end -> pulse 1 peak -> pulse 1 settle -> pulse 2 peak -> pulse 2 settle
const revealEnd = LOGO_REVEAL_MS;
const pulse1Peak = LOGO_REVEAL_MS + BREATHE_CYCLE_MS / 2;
const pulse1Settle = LOGO_REVEAL_MS + BREATHE_CYCLE_MS;
const pulse2Peak = LOGO_REVEAL_MS + BREATHE_CYCLE_MS * 1.5;
const pulse2Settle = LOGO_REVEAL_MS + BREATHE_CYCLE_MS * 2;

const LOGO_TIMES = [0, revealEnd, pulse1Peak, pulse1Settle, pulse2Peak, pulse2Settle].map(
  (t) => t / LOGO_TOTAL_MS
);

const LOGO_EASE: Easing[] = ["easeOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut"];

/**
 * Step 3 + 4 + 5 — the logo itself. Fades and scales in, then breathes
 * (scale 1 → 1.03 → 1) twice. `filter: brightness()` stands in for the
 * "AI waking up" glow/brightness pulse without touching the source image.
 */
export const logoVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, filter: "brightness(0.85)" },
  visible: {
    opacity: [0, 1, 1, 1, 1, 1],
    scale: [0.85, 1, 1.03, 1, 1.03, 1],
    filter: [
      "brightness(0.85)",
      "brightness(1)",
      "brightness(1.15)",
      "brightness(1)",
      "brightness(1.15)",
      "brightness(1)",
    ],
    transition: {
      duration: ms(LOGO_TOTAL_MS),
      times: LOGO_TIMES,
      ease: LOGO_EASE,
    },
  },
};

/**
 * Step 2 + 5 — the soft blue glow behind the logo. Appears first (before
 * the logo finishes fading in), then pulses in lockstep with the logo's
 * breathing animation using the same timeline checkpoints.
 */
export const glowVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: [0, 0.55, 0.55, 0.75, 0.5, 0.6],
    scale: [0.9, 1, 1, 1.06, 1, 1.03],
    transition: {
      duration: ms(LOGO_TOTAL_MS),
      times: LOGO_TIMES,
      ease: "easeInOut",
    },
  },
};

/** Step 6 — application name: fade in + slight upward movement. */
export const titleVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: ms(TITLE_DELAY_MS),
      duration: ms(TITLE_DURATION_MS),
      ease: "easeOut",
    },
  },
};

/** Step 7 — subtitle, delayed 200ms after the title. */
export const subtitleVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: ms(SUBTITLE_DELAY_MS),
      duration: ms(SUBTITLE_DURATION_MS),
      ease: "easeOut",
    },
  },
};

/** Root overlay — only the exit (Step 9 fade-out) is animated. */
export const overlayVariants: Variants = {
  visible: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: ms(FADE_OUT_MS), ease: "easeInOut" },
  },
};
