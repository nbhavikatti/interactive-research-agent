"use client";

import { useState } from "react";
import { CrossPaperAnalysisResult } from "@/lib/session-types";

export function useSessionAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CrossPaperAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeSession = async (paperIds: string[]) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paperIds }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Cross-paper analysis failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let serverResult: CrossPaperAnalysisResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const lines = event
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));

          for (const line of lines) {
            if (line === "[DONE]") {
              continue;
            }

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(line);
            } catch {
              continue;
            }

            if (parsed.error) {
              throw new Error(parsed.error as string);
            }

            if (parsed.result) {
              serverResult = parsed.result as CrossPaperAnalysisResult;
            }
          }
        }
      }

      if (!serverResult) {
        throw new Error("Could not parse the cross-paper analysis.");
      }

      setResult(serverResult);
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

  return { analyzeSession, error, isLoading, result };
}
