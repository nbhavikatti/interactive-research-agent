import { NextRequest } from "next/server";
import { streamExplanation, generateCompletion } from "@/lib/llm-client";
import { renderManimVideo, isRenderServerAvailable } from "@/lib/manim-client";
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
const CLASSIFIER_TIMEOUT_MS = 15_000;

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
    // Also check if the render server is available (in parallel)
    const [classification, renderAvailable] = await Promise.all([
      classifyWithTimeout(promptInput),
      isRenderServerAvailable(),
    ]);

    // If manim was chosen but render server is down, fall back to static
    const effectiveRoute =
      classification.route === "manim_animation" && !renderAvailable
        ? "static_diagram"
        : classification.route;

    const effectiveClassification: ClassifierResult = {
      route: effectiveRoute,
      reason:
        effectiveRoute !== classification.route
          ? "Animation render server unavailable; falling back to static diagram"
          : classification.reason,
    };

    console.log(
      `[viz-router] route=${effectiveClassification.route} reason="${effectiveClassification.reason}" render_server=${renderAvailable}`,
    );

    // Step 2: Build the appropriate prompt based on route
    const prompt =
      effectiveClassification.route === "manim_animation"
        ? buildExplainWithManimPrompt(promptInput)
        : buildExplainPrompt(promptInput);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send classification info to client immediately
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ classification: effectiveClassification })}\n\n`,
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

          // Step 3: If manim route, generate Manim code then render to video
          if (
            effectiveClassification.route === "manim_animation" &&
            parsed?.diagram &&
            (parsed.diagram as Record<string, unknown>).type === "manim"
          ) {
            const diagram = parsed.diagram as Record<string, unknown>;
            const spec = diagram.animation_spec as AnimationSpec | undefined;

            if (spec) {
              // 3a: Generate Manim code
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ status: "generating_manim_code" })}\n\n`,
                ),
              );

              let manimCode = "";
              try {
                manimCode = await generateManimCode(spec);
                diagram.code = manimCode;
              } catch (codeGenError) {
                console.error("[viz-router] Manim code generation failed:", codeGenError);
                diagram.code = "";
              }

              // 3b: Render the video
              if (manimCode) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ status: "rendering_video" })}\n\n`,
                  ),
                );

                const renderResult = await renderManimVideo({ code: manimCode });

                if (renderResult.success) {
                  // Store video as base64 data URL (for v1; switch to Blob storage for production)
                  const base64 = renderResult.videoBuffer.toString("base64");
                  diagram.video_data_url = `data:video/mp4;base64,${base64}`;
                  console.log(
                    `[viz-router] Video rendered successfully (${(renderResult.videoBuffer.length / 1024).toFixed(0)}KB)`,
                  );
                } else {
                  console.error("[viz-router] Video render failed:", renderResult.error);
                  diagram.render_error = renderResult.error;
                }
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
  try {
    const classifierPrompt = buildClassifierPrompt(promptInput);

    const result = await Promise.race([
      generateCompletion(classifierPrompt, 1000),
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

    const preview = result.slice(0, 300).replace(/\n/g, " ");
    return {
      route: "static_diagram" as const,
      reason: `Parse failed. Raw: ${preview}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[viz-router] Classification failed:", msg);
    return {
      route: "static_diagram" as const,
      reason: `Classification error: ${msg}`,
    };
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
