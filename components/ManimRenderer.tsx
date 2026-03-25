"use client";

import { useState } from "react";
import type { AnimationSpec } from "@/lib/types";

interface ManimRendererProps {
  animationSpec: AnimationSpec;
  manimCode: string;
  videoDataUrl?: string;
  renderError?: string;
}

export function ManimRenderer({
  animationSpec,
  manimCode,
  videoDataUrl,
  renderError,
}: ManimRendererProps) {
  const [showCode, setShowCode] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Code");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(manimCode);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy Code"), 2000);
    } catch {
      setCopyLabel("Failed to copy");
      setTimeout(() => setCopyLabel("Copy Code"), 2000);
    }
  };

  const hasCode = manimCode && manimCode !== "MANIM_CODE_PLACEHOLDER";

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        Animated Visualization
      </p>

      {/* Video player */}
      {videoDataUrl ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-purple-200 bg-black">
          <video
            className="w-full"
            controls
            autoPlay
            loop
            playsInline
            src={videoDataUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      ) : renderError ? (
        <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-medium">Video render failed</p>
          <p className="mt-1 text-xs text-yellow-600">{renderError}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-100 p-6 text-center text-sm text-gray-500">
          <p>Render server not available. See animation plan below.</p>
        </div>
      )}

      {/* Animation spec (collapsible) */}
      <div className="mt-3">
        <button
          className="text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
          onClick={() => setShowSpec(!showSpec)}
          type="button"
        >
          {showSpec ? "Hide Animation Plan" : "Show Animation Plan"}
        </button>

        {showSpec && (
          <div className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                ▶
              </div>
              <h3 className="text-sm font-semibold text-purple-900">
                {animationSpec.title}
              </h3>
            </div>

            <p className="mt-2 text-sm text-purple-800">
              {animationSpec.concept_summary}
            </p>

            <div className="mt-3 space-y-1.5">
              {animationSpec.animation_steps.map((step) => (
                <div
                  key={step.step}
                  className="flex items-start gap-2 text-xs text-purple-700"
                >
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-purple-200 text-[10px] font-medium">
                    {step.step}
                  </span>
                  <span>
                    <span className="font-medium">{step.action}</span>
                    {" — "}
                    {step.description}
                  </span>
                </div>
              ))}
            </div>

            {animationSpec.equations.length > 0 && (
              <div className="mt-3 rounded-lg bg-white/60 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                  Equations
                </p>
                <div className="mt-1 space-y-1">
                  {animationSpec.equations.map((eq, i) => (
                    <p key={i} className="font-mono text-xs text-purple-900">
                      {eq}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-3 text-[10px] text-purple-500">
              <span>~{animationSpec.estimated_duration_seconds}s</span>
              <span>{animationSpec.complexity_level}</span>
              <span>{animationSpec.visual_objects.length} objects</span>
            </div>
          </div>
        )}
      </div>

      {/* Manim code section */}
      {hasCode && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <button
              className="text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
              onClick={() => setShowCode(!showCode)}
              type="button"
            >
              {showCode ? "Hide Manim Code" : "Show Manim Code"}
            </button>
            <button
              className="rounded-md border border-purple-200 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
              onClick={handleCopy}
              type="button"
            >
              {copyLabel}
            </button>
          </div>

          {showCode && (
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-gray-200 bg-gray-900 p-4 text-xs leading-5 text-green-300">
              <code>{manimCode}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
