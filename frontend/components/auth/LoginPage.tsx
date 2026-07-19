"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Bot, CheckCircle2, Sparkles } from "lucide-react";
import LoginForm from "./LoginForm";
import SignupPage from "./SignupPage";

const highlights = [
  "Personalized AI practice sessions",
  "Real-time pronunciation feedback",
  "Confidence-building conversation flows",
];

export default function LoginPage() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <main className="min-h-screen bg-[#EEF3FA] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_25px_80px_-24px_rgba(15,23,42,0.2)] lg:min-h-[760px]">
        <section className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_transparent_45%),linear-gradient(135deg,_#f3f8ff_0%,_#e8f1ff_40%,_#dfeeff_100%)] p-8 lg:flex xl:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.08),transparent_38%,rgba(59,130,246,0.02))]" />

          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-blue-700 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Trusted by ambitious learners
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  {/* TODO: Replace this placeholder logo with the final ASpeakSphere logo later. */}
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                    ASpeakSphere
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    Speak English with AI
                  </h1>
                </div>
              </div>

              <p className="max-w-md text-lg leading-8 text-slate-600">
                Practice real conversations, improve pronunciation, and build confidence with a coach that adapts to your level.
              </p>
            </div>

            <div className="mx-auto mt-10 mb-10 flex w-full max-w-[455px] justify-center">
              <Image
                src="/Illustration.jpg"
                alt="AI English Tutor Illustration"
                width={520}
                height={420}
                className="h-auto w-full max-w-[500px] rounded-2xl object-contain drop-shadow-2xl"
                priority
              />
            </div>

            <div className="space-y-3 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Ready when you are</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </section>

        <section className="flex w-full items-center justify-center bg-white p-6 sm:p-8 lg:w-[54%] lg:p-10 xl:p-12">
          <div className="w-full max-w-md">
            <LoginForm onSignup={() => setShowSignup(true)} />
          </div>
        </section>
      </div>

      {showSignup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl">
            <SignupPage onBack={() => setShowSignup(false)} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
