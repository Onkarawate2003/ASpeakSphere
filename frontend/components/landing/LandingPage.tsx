"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import QuoteCarousel from "./QuoteCarousel";

export default function LandingPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-[#EEF3FA] text-gray-900">

            {/* ================= HERO VIDEO ================= */}

            <section className="relative h-[70vh] w-full overflow-hidden">

                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                >
                    <source src="/bg.mp4" type="video/mp4" />
                </video>

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/10"></div>

                {/* Bottom Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#EEF3FA]"></div>

            </section>

            {/* ================= CONTENT ================= */}

            <section className="relative -mt-20 px-6 pb-24">

                <div className="mx-auto max-w-4xl text-center">

                    {/* Badge */}

                    <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 shadow-sm">
                        AI English Tutor · Real-Time Fluency
                    </div>

                    {/* Heading */}

                    <h1 className="mt-8 text-5xl font-bold leading-tight tracking-[-0.04em] text-slate-900 md:text-6xl">
                        Speak English
                        <br />
                        <span className="text-blue-600">
                            confidently with AI.
                        </span>
                    </h1>

                    {/* Description */}

                    <QuoteCarousel />

                    {/* Buttons */}

                    <div className="mt-14 flex flex-col items-center justify-center gap-5 sm:flex-row">

                        <button
                            onClick={() => router.push("/signup")}
                            className="rounded-full bg-indigo-600 px-10 py-5 text-lg font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-indigo-700"
                        >
                            Start Learning Free
                        </button>

                        <Link href="/login">
                            <button className="rounded-full border border-slate-300 bg-white px-10 py-5 text-lg font-semibold text-slate-800 transition-all duration-300 hover:border-blue-600 hover:text-blue-600">
                                Sign In
                            </button>
                        </Link>

                    </div>

                    {/* Footer */}

                    <p className="mt-8 text-base text-slate-500">
                        Join thousands of learners improving their English every day.
                    </p>

                </div>

            </section>

        </main>
    );
}