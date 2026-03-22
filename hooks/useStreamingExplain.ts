"use client";

import { useState } from "react";

export interface ExplanationResult {
  explanation: {
    summary: string;
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
      let accumulated = "";

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

            const parsed = JSON.parse(line) as { text?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.text) {
              accumulated += parsed.text;
              setRawResponse(accumulated);
            }
          }
        }
      }

      const parsedResult = safeParseResult(accumulated);
      setResult(parsedResult);
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

function safeParseResult(raw: string): ExplanationResult {
  try {
    return JSON.parse(raw) as ExplanationResult;
  } catch {
    const cleaned = raw.match(/\{[\s\S]*\}/)?.[0];
    if (cleaned) {
      try {
        return JSON.parse(cleaned) as ExplanationResult;
      } catch {
        return fallbackResult(raw);
      }
    }

    return fallbackResult(raw);
  }
}

function fallbackResult(raw: string): ExplanationResult {
  return {
    explanation: {
      summary: raw.trim() || "The model returned an empty response.",
      intuition: "The response could not be parsed into the expected structure.",
      breakdown: "Try again to generate a structured explanation and diagram.",
    },
    diagram: {
      type: "mermaid",
      code: "graph TD\nA[Retry Request] --> B[Need Valid JSON]",
    },
  };
}
