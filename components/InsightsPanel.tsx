"use client";

import { DiagramRenderer } from "@/components/DiagramRenderer";
import { ExplanationCard } from "@/components/ExplanationCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";

interface InsightsPanelProps {
  state: "empty" | "loading" | "result" | "error";
  selectedText?: string;
  insight?: {
    explanation: {
      summary: string;
      coreIdea: string;
      intuition: string;
      breakdown: string;
    };
    diagram: {
      type: string;
      code: string;
    };
  } | null;
  error?: string | null;
  onRetry?: () => void;
}

export function InsightsPanel({
  state,
  selectedText,
  insight,
  error,
  onRetry,
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
    return (
      <div className="space-y-5 p-6 transition-opacity duration-150">
        {quote}
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
      <ExplanationCard explanation={insight.explanation} />
      <DiagramRenderer mermaidCode={insight.diagram.code} />
    </div>
  );
}
