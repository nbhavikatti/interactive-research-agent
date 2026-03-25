"use client";

import { DiagramRenderer } from "@/components/DiagramRenderer";
import { ExplanationCard } from "@/components/ExplanationCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import type { ExplainViewModel } from "@/lib/types";

interface InsightsPanelProps {
  state: "empty" | "loading" | "result" | "error";
  selectedText?: string;
  insight?: ExplainViewModel | null;
  error?: string | null;
  onRetry?: () => void;
  statusMessage?: string | null;
}

export function InsightsPanel({
  state,
  selectedText,
  insight,
  error,
  onRetry,
  statusMessage,
}: InsightsPanelProps) {
  const quote = selectedText ? (
    <blockquote className="rounded-2xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900">
      {selectedText}
    </blockquote>
  ) : null;

  if (state === "empty") {
    return (
      <div className="flex min-h-full items-center justify-center p-8 transition-opacity duration-150">
        <div className="max-w-sm text-center text-gray-400">
          <div className="text-4xl">💡</div>
          <h2 className="mt-4 text-xl font-medium text-gray-500">
            Highlight any passage in the paper
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Select text to get an AI-powered explanation and visual diagram.
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    if (insight?.explanation) {
      return (
        <div className="space-y-5 p-6 transition-opacity duration-150">
          {quote}
          {statusMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
              {statusMessage}
            </div>
          )}
          <ExplanationCard explanation={insight.explanation} />
          {insight.diagram?.type === "mermaid" ? (
            <DiagramRenderer mermaidCode={insight.diagram.code} />
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-5 p-6 transition-opacity duration-150">
        {quote}
        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-3 py-2 text-xs text-purple-700">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
            {statusMessage}
          </div>
        )}
        <SkeletonLoader />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-5 p-6 transition-opacity duration-150">
        {quote}
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error ?? "Something went wrong while generating the explanation."}</p>
          {onRetry ? (
            <button
              className="mt-4 rounded-full border border-red-300 px-4 py-2 font-medium transition hover:bg-red-100"
              onClick={onRetry}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <div className="space-y-5 p-6 transition-opacity duration-150">
      {quote}

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
          {statusMessage}
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p>{error}</p>
          {onRetry ? (
            <button
              className="mt-4 rounded-full border border-yellow-300 px-4 py-2 font-medium transition hover:bg-yellow-100"
              onClick={onRetry}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {insight.explanation ? (
        <ExplanationCard explanation={insight.explanation} />
      ) : null}

      {insight.diagram?.type === "mermaid" ? (
        <DiagramRenderer mermaidCode={insight.diagram.code} />
      ) : null}
    </div>
  );
}
