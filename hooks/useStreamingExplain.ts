"use client";

import { useState } from "react";
import type {
  ExplainViewModel,
  ExplanationContent,
} from "@/lib/types";

type ExplainStreamEvent =
  | {
      type: "explanation_ready";
      explanation: ExplanationContent;
      diagram?: { type: "mermaid"; code: string };
    }
  | { type: "diagram_ready"; diagram: { type: "mermaid"; code: string } }
  | {
      type: "error";
      stage: "generation" | "request";
      message: string;
    }
  | { type: "done" };

function createEmptyResult(): ExplainViewModel {
  return {
    explanation: null,
    diagram: null,
  };
}

export function useStreamingExplain() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExplainViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const requestExplanation = async (
    paperId: string,
    selectedText: string,
    pageNumber: number,
  ) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("Generating explanation and diagram...");

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
            let parsed: ExplainStreamEvent;
            try {
              parsed = JSON.parse(line) as ExplainStreamEvent;
            } catch {
              continue;
            }

            if (parsed.type === "explanation_ready") {
              setResult((prev) => ({
                ...(prev ?? createEmptyResult()),
                explanation: parsed.explanation,
                diagram: parsed.diagram ?? prev?.diagram ?? null,
              }));
              setStatusMessage("Generating diagram...");
              continue;
            }

            if (parsed.type === "diagram_ready") {
              setResult((prev) => ({
                ...(prev ?? createEmptyResult()),
                diagram: parsed.diagram,
              }));
              continue;
            }

            if (parsed.type === "error") {
              setError(parsed.message);
              continue;
            }

            if (parsed.type === "done") {
              setStatusMessage(null);
            }
          }
        }
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not explain that selection.",
      );
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    result,
    error,
    statusMessage,
    requestExplanation,
  };
}
