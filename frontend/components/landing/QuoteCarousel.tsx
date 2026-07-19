"use client";

import { useState } from "react";

const quotes = [
  "Practice real-life conversations, improve your pronunciation, and receive instant AI feedback that helps you become a confident English speaker.",

  "Build confidence by speaking English every day with your personal AI tutor.",

  "Master pronunciation with instant corrections after every conversation.",

  "Practice realistic conversations for interviews, travel, and daily life.",

  "Your AI tutor adapts every lesson to your speaking level.",

  "Learn naturally through conversations instead of memorizing grammar rules."
];

export default function QuoteCarousel() {
  const [currentQuote, setCurrentQuote] = useState(0);

  const nextQuote = () => {
    setCurrentQuote((prev) => (prev + 1) % quotes.length);
  };

  const previousQuote = () => {
    setCurrentQuote((prev) =>
      prev === 0 ? quotes.length - 1 : prev - 1
    );
  };

  return (
    <div className="mt-10">

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">

        <div className="flex items-center justify-between">

          <button
            onClick={previousQuote}
            className="text-3xl font-bold text-blue-600 hover:text-blue-800"
          >
            ←
          </button>

          <p className="mx-6 flex-1 text-center text-xl leading-9 text-slate-700">
            {quotes[currentQuote]}
          </p>

          <button
            onClick={nextQuote}
            className="text-3xl font-bold text-blue-600 hover:text-blue-800"
          >
            →
          </button>

        </div>

      </div>

      {/* Indicator Dots */}

      <div className="mt-6 flex justify-center gap-3">

        {quotes.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentQuote(index)}
            className={`h-3 w-3 rounded-full transition-all ${
              currentQuote === index
                ? "bg-blue-600"
                : "bg-slate-300"
            }`}
          />
        ))}

      </div>

    </div>
  );
}