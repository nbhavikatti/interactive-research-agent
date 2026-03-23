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

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Explanation request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let serverResult: ExplanationResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const lines = event
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));

          for (const line of lines) {
            if (line === "[DONE]") continue;

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(line);
            } catch {
              continue;
            }

            if (parsed.error) {
              throw new Error(parsed.error as string);
            }

            // Server sends the parsed result as the final event
            if (parsed.result) {
              serverResult = parsed.result as ExplanationResult;
            }

            if (parsed.text) {
              setRawResponse((prev) => prev + (parsed.text as string));
            }
          }
        }
      }

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

  return { isLoading, result, error, rawResponse, requestExplanation };
}
