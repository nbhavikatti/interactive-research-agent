"use client";

import { useState } from "react";
import {
  CrossPaperAnalysisDebug,
  CrossPaperAnalysisResult,
} from "@/lib/session-types";

interface AnalyzeSessionResponse {
  debug?: CrossPaperAnalysisDebug;
  error?: string;
  result?: CrossPaperAnalysisResult | null;
}

export function useSessionAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CrossPaperAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<CrossPaperAnalysisDebug | null>(null);

  const analyzeSession = async (paperIds: string[]) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setDebug(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paperIds }),
      });

      const payload = (await response.json().catch(() => null)) as
        | AnalyzeSessionResponse
        | null;

      if (!response.ok) {
        setDebug(payload?.debug ?? null);
        throw new Error(payload?.error ?? "Cross-paper analysis failed.");
      }

      if (!payload?.result) {
        setDebug(payload?.debug ?? null);
        throw new Error("Could not parse the cross-paper analysis.");
      }

      setDebug(payload.debug ?? null);
      setResult(payload.result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not analyze this paper set.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { analyzeSession, debug, error, isLoading, result };
}
