"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Cloning repository",
  "Parsing file structure",
  "Analyzing architecture",
  "Identifying key files",
  "Building reading order",
  "Generating summary",
];

interface AnalysisProgressProps {
  onComplete: () => void;
}

export function AnalysisProgress({ onComplete }: AnalysisProgressProps) {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (completedSteps >= STEPS.length) {
      const timeout = setTimeout(onComplete, 600);
      return () => clearTimeout(timeout);
    }
    const delay = 500 + Math.random() * 500;
    const timeout = setTimeout(() => setCompletedSteps((s) => s + 1), delay);
    return () => clearTimeout(timeout);
  }, [completedSteps, onComplete]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Animated gradient background — matches landing page */}
      <div className="animate-gradient-shift absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
      <div className="animate-float animate-pulse-soft pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="animate-float-delayed animate-pulse-soft pointer-events-none absolute -right-16 top-1/4 h-60 w-60 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="animate-float pointer-events-none absolute -bottom-10 left-1/3 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-indigo-500/5 backdrop-blur-lg">
          {/* Progress bar */}
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${(completedSteps / STEPS.length) * 100}%` }}
            />
          </div>

          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Analyzing repository&hellip;
          </h2>

          <ul className="space-y-3">
            {STEPS.map((step, i) => {
              const isDone = i < completedSteps;
              const isActive = i === completedSteps && completedSteps < STEPS.length;

              return (
                <li
                  key={step}
                  className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                    i > completedSteps ? "opacity-40" : "opacity-100"
                  }`}
                >
                  {isDone ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 transition-transform duration-200">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  ) : isActive ? (
                    <span className="flex h-5 w-5 items-center justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                    </span>
                  )}
                  <span
                    className={
                      isDone
                        ? "text-gray-700"
                        : isActive
                          ? "font-medium text-gray-900"
                          : "text-gray-400"
                    }
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
