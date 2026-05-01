"use client";

import {
  CrossPaperAnalysisResult,
  CrossPaperReference,
  SessionPaper,
} from "@/lib/session-types";

interface CrossPaperInsightsPanelProps {
  papers: SessionPaper[];
  state: "idle" | "loading" | "result" | "error";
  result?: CrossPaperAnalysisResult | null;
  error?: string | null;
  onReferenceSelect?: (reference: CrossPaperReference) => void;
  onRetry?: () => void;
}

export function CrossPaperInsightsPanel({
  papers,
  state,
  result,
  error,
  onReferenceSelect,
  onRetry,
}: CrossPaperInsightsPanelProps) {
  const isSinglePaper = papers.length === 1;

  if (state === "loading") {
    return (
      <div className="space-y-6 p-6">
        <Header papers={papers} />
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded-full bg-slate-700" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-900" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-900" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-900" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-6 p-6">
        <Header papers={papers} />
        <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          <p>{error ?? "Something went wrong while analyzing these papers."}</p>
          {onRetry ? (
            <button
              className="mt-4 rounded-full border border-red-400/30 px-4 py-2 font-medium transition hover:bg-red-500/10"
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
        <div className="max-w-md rounded-[32px] border border-slate-800 bg-slate-950/80 p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
            {isSinglePaper ? "Paper analysis" : "Cross-paper mode"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">
            {isSinglePaper
              ? "Analyze the uploaded paper"
              : "Compare themes across the session"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {isSinglePaper
              ? "This pane focuses on grounded claims and source references you can open in the middle viewer."
              : "This pane now focuses on verifiable cross-paper claims, with source references you can open in the middle viewer."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Header papers={papers} />

      <section className="rounded-[28px] border border-slate-800 bg-slate-950/75 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
          Overview
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-300">{result.overview}</p>
      </section>

      {result.warnings.length > 0 ? (
        <section className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Analysis warnings</p>
          <ul className="mt-2 space-y-2 text-amber-100/90">
            {result.warnings.map((warning, index) => (
              <li key={`warning-${index}`}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        {result.insights.map((insight) => (
          <article
            key={insight.id}
            className="rounded-[28px] border border-slate-800 bg-slate-950/75 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
              Insight
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-50">
              {insight.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              {insight.insight}
            </p>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                Why it matters
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {insight.whyItMatters}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                Supporting references
              </p>
              <div className="mt-3 space-y-3">
                {insight.references.map((reference, index) => (
                  <button
                    key={`${insight.id}-reference-${index}`}
                    className="block w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition hover:border-sky-400/40 hover:bg-slate-900"
                    onClick={() => onReferenceSelect?.(reference)}
                    type="button"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {reference.paperTitle || reference.filename}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {reference.filename}
                      {reference.pageNumber ? ` · Page ${reference.pageNumber}` : ""}
                      {reference.section ? ` · ${reference.section}` : ""}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {reference.snippet}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {result.paperSnapshots.length > 0 ? (
        <section className="rounded-[28px] border border-slate-800 bg-slate-950/75 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
            Paper snapshots
          </p>
          <div className="mt-4 space-y-3">
            {result.paperSnapshots.map((snapshot) => (
              <article
                key={snapshot.paperId}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-100">
                  {snapshot.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  <span className="font-medium text-slate-100">Focus:</span>{" "}
                  {snapshot.focus}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  <span className="font-medium text-slate-100">Notable angle:</span>{" "}
                  {snapshot.notableAngle}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Header({ papers }: { papers: SessionPaper[] }) {
  const isSinglePaper = papers.length === 1;

  return (
    <section className="rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(2,6,23,0.95))] p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
        Analysis
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
        {isSinglePaper
          ? "Analysis for 1 uploaded paper"
          : `Cross-paper insights for ${papers.length} uploaded papers`}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {isSinglePaper
          ? "Each claim includes source references so you can open the supporting passage in the middle pane and verify it directly."
          : "Each claim includes source references so you can open the supporting paper in the middle pane and verify it directly."}
      </p>
    </section>
  );
}
