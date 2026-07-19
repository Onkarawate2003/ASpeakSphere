"use client";

import { useLayoutEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  SPLASH_TIMING,
  SPLASH_TOTAL_DURATION_MS,
  glowVariants,
  logoVariants,
  overlayVariants,
  subtitleVariants,
  titleVariants,
} from "./animations";

/**
 * Module-scoped, not React state: it must survive Next.js client-side
 * route changes (the module stays loaded in memory) but reset on a full
 * page reload, so the splash plays once per browser session and can
 * reappear on refresh.
 */
let hasPlayedThisSession = false;

interface SplashScreenProps {
  /** Called once the splash has finished playing, or been skipped. */
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  // useLayoutEffect (not useEffect) so the skip decision is applied before
  // the browser paints — the caller unmounts this component on the same
  // synchronous pass, so a returning visitor never sees a dark flash.
  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (hasPlayedThisSession || prefersReducedMotion) {
      onComplete();
      return;
    }

    hasPlayedThisSession = true;

    const startFadeOut = setTimeout(
      () => setVisible(false),
      SPLASH_TIMING.holdUntilMs
    );
    const finish = setTimeout(onComplete, SPLASH_TOTAL_DURATION_MS);

    return () => {
      clearTimeout(startFadeOut);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0F172A]"
          variants={overlayVariants}
          initial="visible"
          animate="visible"
          exit="exit"
          role="presentation"
          aria-hidden="true"
        >
          {/* Step 2 — soft blue glow in the center */}
          <motion.div
            className="pointer-events-none absolute h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.55)_0%,_rgba(59,130,246,0)_70%)] blur-2xl sm:h-[360px] sm:w-[360px]"
            variants={glowVariants}
            initial="hidden"
            animate="visible"
          />

          {/* Step 3 + 4 + 5 — logo fade/scale in, then breathe + glow pulse */}
          <motion.div variants={logoVariants} initial="hidden" animate="visible">
            <Image
              src="/logo.png"
              alt="ASpeakSphere"
              width={220}
              height={120}
              preload
              className="h-auto w-[140px] sm:w-[180px]"
            />
          </motion.div>

          {/* Step 6 — application name */}
          <motion.h1
            className="mt-6 text-2xl font-semibold tracking-wide text-white sm:text-3xl"
            variants={titleVariants}
            initial="hidden"
            animate="visible"
          >
            ASpeakSphere
          </motion.h1>

          {/* Step 7 — subtitle */}
          <motion.p
            className="mt-2 text-sm text-blue-100/70 sm:text-base"
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
          >
            Your AI English Tutor
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
