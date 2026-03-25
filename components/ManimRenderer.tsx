"use client";

import { useState } from "react";
import type { AnimationSpec } from "@/lib/types";

interface ManimRendererProps {
  animationSpec: AnimationSpec;
  manimCode: string;
}

export function ManimRenderer({ animationSpec, manimCode }: ManimRendererProps) {
  const [showCode, setShowCode] = useState(false);
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

      {/* Animation spec summary */}
      <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50 p-4">
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

        {/* Animation steps preview */}
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

        {/* Equations */}
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

        {/* Metadata row */}
        <div className="mt-3 flex gap-3 text-[10px] text-purple-500">
          <span>~{animationSpec.estimated_duration_seconds}s</span>
          <span>{animationSpec.complexity_level}</span>
          <span>{animationSpec.visual_objects.length} objects</span>
        </div>
      </div>

      {/* Manim code section */}
      {hasCode && (
        <div className="mt-3">
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

      {/* Render instructions */}
      {hasCode && (
        <div className="mt-3 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500">
          Run locally:{" "}
          <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-700">
            manim -pql scene.py ConceptScene
          </code>
        </div>
      )}

      {!hasCode && (
        <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-700">
          Manim code generation was not available. The animation specification
          above describes the intended visualization.
        </div>
      )}
    </div>
  );
}
