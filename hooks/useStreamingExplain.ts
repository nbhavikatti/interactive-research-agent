"use client";

import { useState } from "react";

export interface ExplanationResult {
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
}

export function useStreamingExplain() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState("");

  const reset = () => {
    setIsLoading(false);
    setResult(null);
    setError(null);
    setRawResponse("");
  };

  const requestExplanation = async (
    paperId: string,
    selectedText: string,
    pageNumber: number,
  ) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setRawResponse("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paperId, selectedText, pageNumber }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Explanation request failed.");
      }
      const payload = (await response.json()) as {
        result?: ExplanationResult;
        llmResponseDebug?: { rawText?: string; outputText?: string };
      };

      const serverResult = payload.result ?? null;
      setRawResponse(
        payload.llmResponseDebug?.rawText ?? payload.llmResponseDebug?.outputText ?? "",
      );

      if (serverResult?.explanation && serverResult?.diagram) {
        setResult(serverResult);
      } else {
        throw new Error("Could not parse the explanation.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not explain that selection.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, result, error, rawResponse, requestExplanation, reset };
}
