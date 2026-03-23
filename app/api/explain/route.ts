import { NextRequest } from "next/server";
import { streamExplanation } from "@/lib/llm-client";
import { paperStore } from "@/lib/paper-store";
import { buildExplainPrompt } from "@/lib/prompt-builder";
import { rateLimit } from "@/lib/rate-limit";

// 20 explain requests per IP per 15 minutes
const RATE_LIMIT = { maxRequests: 20, windowMs: 15 * 60 * 1000 };

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

    const prompt = buildExplainPrompt({
      pages: paper.pages,
      selectedText,
      pageNumber,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulated = "";
        try {
          for await (const chunk of streamExplanation(prompt)) {
            accumulated += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            );
          }

          // Parse on the server so the client never has to deal with
          // control-character escaping issues from the SSE round-trip.
          const parsed = serverParseResult(accumulated);
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
