import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import {
  explanationContentSchema,
  generateCompletion,
  generateStructuredObject,
  mermaidDiagramSchema,
  parseStructuredText,
} from "@/lib/llm-client";
import { paperStore } from "@/lib/paper-store";
import {
  buildExplanationOnlyPrompt,
  buildExplanationRetryPrompt,
  buildMermaidDiagramPrompt,
} from "@/lib/prompt-builder";
import { rateLimit } from "@/lib/rate-limit";
import type { ExplanationContent } from "@/lib/types";

const RATE_LIMIT = { maxRequests: 20, windowMs: 15 * 60 * 1000 };

type ExplainErrorStage = "generation" | "request";

type ExplainStreamEvent =
  | {
      type: "explanation_ready";
      explanation: ExplanationContent;
      diagram?: { type: "mermaid"; code: string };
    }
  | { type: "error"; stage: ExplainErrorStage; message: string }
  | { type: "done" };

class ExplainStageError extends Error {
  stage: ExplainErrorStage;

  constructor(stage: ExplainErrorStage, message: string) {
    super(message);
    this.stage = stage;
    this.name = "ExplainStageError";
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const { paperId, selectedText, pageNumber } = await req.json();

    if (!paperId || !selectedText || !pageNumber) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500 },
      );
    }

    const paper = await paperStore.get(paperId);
    if (!paper) {
      return new Response(JSON.stringify({ error: "Paper not found" }), {
        status: 404,
      });
    }

    const requestId = randomUUID().slice(0, 8);
    const promptInput = {
      pages: paper.pages,
      selectedText,
      pageNumber,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const startedAt = Date.now();
        const send = (event: ExplainStreamEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        try {
          // Run explanation and diagram generation in parallel
          const explanationPromise = generateExplanationContent(
            promptInput,
            requestId,
          );
          const diagramPromise = generateStructuredObject(
            buildMermaidDiagramPrompt(promptInput),
            mermaidDiagramSchema,
            "mermaid_diagram",
            900,
          ).catch((err) => {
            logStage(requestId, `diagram_failed message="${err instanceof Error ? err.message : "unknown"}"`);
            return null;
          });

          const [explanationResult, diagramResult] = await Promise.all([
            explanationPromise,
            diagramPromise,
          ]);

          logStage(
            requestId,
            `explanation_ready ms=${Date.now() - startedAt}`,
          );

          if (explanationResult) {
            send({
              type: "explanation_ready",
              explanation: explanationResult,
              diagram: diagramResult ?? undefined,
            });
          } else {
            send({
              type: "error",
              stage: "generation",
              message: "Could not generate the explanation.",
            });
          }

          send({ type: "done" });
          controller.close();
        } catch (error) {
          const stageError = toStageError(error);
          logStage(
            requestId,
            `${stageError.stage}_error message="${stageError.message}"`,
          );
          send({
            type: "error",
            stage: stageError.stage,
            message: stageError.message,
          });
          send({ type: "done" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request payload" }), {
      status: 400,
    });
  }
}

function logStage(requestId: string, message: string) {
  console.log(`[explain:${requestId}] ${message}`);
}

async function generateExplanationContent(
  promptInput: Parameters<typeof buildExplanationOnlyPrompt>[0],
  requestId: string,
): Promise<ExplanationContent | null> {
  try {
    return await generateStructuredObject(
      buildExplanationOnlyPrompt(promptInput),
      explanationContentSchema,
      "explanation_content",
      1200,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Structured explanation failed.";
    logStage(requestId, `explanation_retry message="${message}"`);
  }

  const retryResult = await generateCompletion(
    buildExplanationRetryPrompt(promptInput),
    1500,
  );
  const loose = extractExplanationFromLooseText(retryResult);
  if (loose) {
    logStage(requestId, "explanation_retry_parse_success");
    return loose;
  }

  logStage(
    requestId,
    `explanation_failed raw="${retryResult.slice(0, 400).replace(/\n/g, " ")}"`,
  );
  return null;
}

function extractExplanationFromLooseText(text: string): ExplanationContent | null {
  const compact = text.trim();
  if (!compact) return null;

  const jsonParsed = parseStructuredText(compact, explanationContentSchema);
  if (jsonParsed) {
    return normalizeExplanationContent(jsonParsed);
  }

  const summary = extractLabeledSection(compact, ["summary"]);
  const coreIdea = extractLabeledSection(compact, ["core idea", "coreidea"]);
  const intuition = extractLabeledSection(compact, ["intuition"]);
  const breakdown = extractLabeledSection(compact, [
    "breakdown",
    "step-by-step breakdown",
  ]);

  if (summary && coreIdea && intuition && breakdown) {
    return normalizeExplanationContent({
      summary,
      coreIdea,
      intuition,
      breakdown,
    });
  }

  return null;
}

function extractLabeledSection(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${escaped}\\s*:\\s*(.*?)(?=\\n\\s*(summary|core idea|coreidea|intuition|breakdown|step-by-step breakdown)\\s*:|$)`,
      "is",
    );
    const match = text.match(pattern);
    const value = normalizeSectionText(match?.[1] ?? "");
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeExplanationContent(
  content: ExplanationContent,
): ExplanationContent {
  return {
    summary: normalizeSectionText(content.summary),
    coreIdea: normalizeSectionText(content.coreIdea),
    intuition: normalizeSectionText(content.intuition),
    breakdown: normalizeSectionText(content.breakdown),
  };
}

function normalizeSectionText(value: string): string {
  return value
    .replace(/^["']+|["'}\]]+$/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function toStageError(error: unknown): ExplainStageError {
  if (error instanceof ExplainStageError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : "Explanation request failed.";

  return new ExplainStageError(
    "generation",
    message.includes("mermaid_diagram")
      ? "Could not generate a valid diagram payload."
      : message.includes("explanation_content")
        ? "The model returned an invalid explanation payload."
        : message,
  );
}
