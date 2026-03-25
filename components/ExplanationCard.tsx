"use client";

import { MathFormattedText } from "@/components/MathFormattedText";

interface ExplanationCardProps {
  explanation: {
    summary: string;
    coreIdea: string;
    intuition: string;
    breakdown: string;
  };
}

export function ExplanationCard({ explanation }: ExplanationCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-opacity duration-150">
      <section className="border-b border-gray-100 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Summary
        </p>
        <MathFormattedText
          className="mt-3 text-base leading-7 text-gray-800"
          content={explanation.summary}
        />
      </section>

      <section className="border-b border-gray-100 pb-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Core Idea
        </p>
        <MathFormattedText
          className="mt-3 text-base leading-7 text-gray-800"
          content={explanation.coreIdea}
        />
      </section>

      <section className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Intuition
        </p>
        <MathFormattedText
          className="mt-3 text-base leading-7 text-gray-700"
          content={explanation.intuition}
        />
      </section>

      <section className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Step-by-step Breakdown
        </p>
        <MathFormattedText
          className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700"
          content={explanation.breakdown}
        />
      </section>
    </div>
  );
}
