"use client";

import { useState } from "react";
import LandingPage from "@/components/landing/LandingPage";
import { SplashScreen } from "@/components/SplashScreen";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return <LandingPage />;
}