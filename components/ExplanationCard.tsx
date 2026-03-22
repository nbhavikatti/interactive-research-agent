"use client";

interface ExplanationCardProps {
  explanation: {
    summary: string;
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
        <p className="mt-3 text-base leading-7 text-gray-800">
          {explanation.summary}
        </p>
      </section>

      <section className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Intuition
        </p>
        <p className="mt-3 text-base leading-7 text-gray-700">
          {explanation.intuition}
        </p>
      </section>

      <section className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Step-by-step Breakdown
        </p>
        <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
          {explanation.breakdown}
        </div>
      </section>
    </div>
  );
}
