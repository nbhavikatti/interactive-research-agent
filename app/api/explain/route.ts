import { NextRequest } from "next/server";
import { streamExplanation, generateCompletion } from "@/lib/llm-client";
import { paperStore } from "@/lib/paper-store";
import {
  buildExplainPrompt,
  buildExplainWithManimPrompt,
  buildClassifierPrompt,
  buildManimCodePrompt,
} from "@/lib/prompt-builder";
import { rateLimit } from "@/lib/rate-limit";
import type { ClassifierResult, AnimationSpec } from "@/lib/types";

// 20 explain requests per IP per 15 minutes
const RATE_LIMIT = { maxRequests: 20, windowMs: 15 * 60 * 1000 };

// Timeout for the classifier step (ms)
const CLASSIFIER_TIMEOUT_MS = 6_000;

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

    const promptInput = {
      pages: paper.pages,
      selectedText,
      pageNumber,
    };

    // Step 1: Classify the visualization route
    const classification = await classifyWithTimeout(promptInput);
    console.log(
      `[viz-router] route=${classification.route} reason="${classification.reason}"`,
    );

    // Step 2: Build the appropriate prompt based on route
    const prompt =
      classification.route === "manim_animation"
        ? buildExplainWithManimPrompt(promptInput)
        : buildExplainPrompt(promptInput);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send classification info to client immediately
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ classification })}\n\n`,
          ),
        );

        let accumulated = "";
        try {
          for await (const chunk of streamExplanation(prompt)) {
            accumulated += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            );
          }

          const parsed = serverParseResult(accumulated);

          // Step 3: If manim route, generate actual Manim code from the spec
          if (
            classification.route === "manim_animation" &&
            parsed?.diagram &&
            (parsed.diagram as Record<string, unknown>).type === "manim"
          ) {
            const diagram = parsed.diagram as Record<string, unknown>;
            const spec = diagram.animation_spec as AnimationSpec | undefined;

            if (spec) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ status: "generating_manim_code" })}\n\n`,
                ),
              );

              try {
                const manimCode = await generateManimCode(spec);
                diagram.code = manimCode;
              } catch (codeGenError) {
                console.error("[viz-router] Manim code generation failed:", codeGenError);
                // Fallback: keep the placeholder code, frontend will handle gracefully
                diagram.code = "";
              }
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ result: parsed })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "LLM request failed" })}\n\n`,
            ),
          );
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

/**
 * Classify the visualization type with a timeout. Falls back to static_diagram
 * if the classifier fails or times out.
 */
async function classifyWithTimeout(
  promptInput: Parameters<typeof buildClassifierPrompt>[0],
): Promise<ClassifierResult> {
  const defaultResult: ClassifierResult = {
    route: "static_diagram",
    reason: "Classification timed out or failed; defaulting to static diagram",
  };

  try {
    const classifierPrompt = buildClassifierPrompt(promptInput);

    const result = await Promise.race([
      generateCompletion(classifierPrompt, 200),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CLASSIFIER_TIMEOUT_MS),
      ),
    ]);

    const parsed = serverParseResult(result);
    if (
      parsed &&
      (parsed.route === "static_diagram" || parsed.route === "manim_animation") &&
      typeof parsed.reason === "string"
    ) {
      return parsed as unknown as ClassifierResult;
    }

    return defaultResult;
  } catch (err) {
    console.error("[viz-router] Classification failed:", err);
    return defaultResult;
  }
}

/**
 * Generate Manim code from an animation spec. Timeout of 30s.
 */
async function generateManimCode(spec: AnimationSpec): Promise<string> {
  const prompt = buildManimCodePrompt(spec);

  const result = await Promise.race([
    generateCompletion(prompt, 2000),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 30_000),
    ),
  ]);

  const parsed = serverParseResult(result);
  if (parsed && typeof parsed.manim_code === "string") {
    return parsed.manim_code;
  }

  // Try to extract raw python code if JSON parsing failed
  const codeMatch = result.match(/```python\n?([\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  return result.trim();
}

/**
 * Parse the LLM's JSON response on the server. The raw text from the LLM
 * may contain actual control characters (newlines, tabs) inside JSON string
 * values. We fix those before parsing.
 */
function serverParseResult(raw: string): Record<string, unknown> | null {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // noop
  }

  // Strip markdown fences
  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "");
  try {
    return JSON.parse(stripped);
  } catch {
    // noop
  }

  // Extract { ... } and fix control chars inside string values
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(escapeControlCharsInStrings(match[0]));
    } catch {
      // noop
    }
  }

  return null;
}

function escapeControlCharsInStrings(text: string): string {
  let result = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && text[j] === "\\"; j--) backslashes++;
      if (backslashes % 2 === 0) inString = !inString;
      result += ch;
      continue;
    }
    if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
    } else {
      result += ch;
    }
  }
  return result;
}
