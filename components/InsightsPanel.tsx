"use client";

import { DiagramRenderer } from "@/components/DiagramRenderer";
import { ExplanationCard } from "@/components/ExplanationCard";
import { ManimRenderer } from "@/components/ManimRenderer";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import type { ClassificationInfo } from "@/hooks/useStreamingExplain";
import type { AnimationSpec } from "@/lib/types";

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
    diagram:
      | {
          type: string;
          code: string;
        }
      | {
          type: "manim";
          animation_spec: AnimationSpec;
          code: string;
        };
  } | null;
  error?: string | null;
  onRetry?: () => void;
  classification?: ClassificationInfo | null;
  isManimGenerating?: boolean;
}

export function InsightsPanel({
  state,
  selectedText,
  insight,
  error,
  onRetry,
  classification,
  isManimGenerating,
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
        {classification && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">
              {classification.route === "manim_animation"
                ? "Generating animation..."
                : "Generating diagram..."}
            </span>
            {" — "}
            {classification.reason}
          </div>
        )}
        {isManimGenerating && (
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-3 py-2 text-xs text-purple-700">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
            Generating Manim code...
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

  const isManimDiagram =
    insight.diagram.type === "manim" &&
    "animation_spec" in insight.diagram;

  return (
    <div className="space-y-5 p-6 transition-opacity duration-150">
      {quote}

      {classification && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {classification.route === "manim_animation"
              ? "Animated visualization"
              : "Static diagram"}
          </span>
          {" — "}
          {classification.reason}
        </div>
      )}

      <ExplanationCard explanation={insight.explanation} />

      {isManimDiagram ? (
        <ManimRenderer
          animationSpec={
            (insight.diagram as { animation_spec: AnimationSpec }).animation_spec
          }
          manimCode={insight.diagram.code}
          videoDataUrl={
            "video_data_url" in insight.diagram
              ? (insight.diagram as { video_data_url?: string }).video_data_url
              : undefined
          }
          renderError={
            "render_error" in insight.diagram
              ? (insight.diagram as { render_error?: string }).render_error
              : undefined
          }
        />
      ) : (
        <DiagramRenderer mermaidCode={insight.diagram.code} />
      )}
    </div>
  );
}
