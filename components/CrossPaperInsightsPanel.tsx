"use client";

import { CrossPaperAnalysisResult, SessionPaper } from "@/lib/session-types";

interface CrossPaperInsightsPanelProps {
  papers: SessionPaper[];
  state: "idle" | "loading" | "result" | "error";
  result?: CrossPaperAnalysisResult | null;
  error?: string | null;
  onRetry?: () => void;
}

export function CrossPaperInsightsPanel({
  papers,
  state,
  result,
  error,
  onRetry,
}: CrossPaperInsightsPanelProps) {
  if (state === "loading") {
    return (
      <div className="space-y-6 p-6">
        <Header papers={papers} />
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded-full bg-stone-200" />
          <div className="h-20 animate-pulse rounded-3xl bg-stone-100" />
          <div className="h-20 animate-pulse rounded-3xl bg-stone-100" />
          <div className="h-20 animate-pulse rounded-3xl bg-stone-100" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-6 p-6">
        <Header papers={papers} />
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{error ?? "Something went wrong while analyzing these papers."}</p>
          {onRetry ? (
            <button
              className="mt-4 rounded-full border border-red-300 px-4 py-2 font-medium transition hover:bg-red-100"
              onClick={onRetry}
              type="button"
            >
              Retry analysis
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (state !== "result" || !result) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-md rounded-[32px] border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Cross-paper mode
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">
            Compare themes across the session
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your uploaded papers stay available for reference while the analysis
            surface focuses on shared ideas, differences, and follow-on
            opportunities across the set.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Header papers={papers} />

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Overview
        </p>
        <p className="mt-3 text-sm leading-7 text-stone-700">{result.overview}</p>
      </section>

      <InsightList
        items={result.sharedThemes}
        title="Shared themes"
        tone="amber"
      />
      <InsightList
        items={result.keyDifferences}
        title="Key differences"
        tone="sky"
      />
      <InsightList
        items={result.crossPaperOpportunities}
        title="Idea opportunities"
        tone="emerald"
      />

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Paper snapshots
        </p>
        <div className="mt-4 space-y-3">
          {result.paperSnapshots.map((snapshot) => (
            <article
              key={snapshot.paperId}
              className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4"
            >
              <h3 className="text-sm font-semibold text-stone-900">
                {snapshot.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                <span className="font-medium text-stone-900">Focus:</span>{" "}
                {snapshot.focus}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                <span className="font-medium text-stone-900">Notable angle:</span>{" "}
                {snapshot.notableAngle}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Header({ papers }: { papers: SessionPaper[] }) {
  return (
    <section className="rounded-[32px] border border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(217,119,6,0.12),_transparent_35%),linear-gradient(135deg,_#fffef8,_#ffffff_60%)] p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Analysis
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
        Cross-paper insights for {papers.length} uploaded papers
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        This view is tuned for comparison, synthesis, and idea generation across
        the session rather than single-paper passage explanation.
      </p>
    </section>
  );
}

function InsightList({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "amber" | "sky" | "emerald";
}) {
  const toneClasses = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    sky: "bg-sky-50 text-sky-800 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClasses[tone]}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
