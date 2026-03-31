import { NextRequest } from "next/server";
import { streamExplanation } from "@/lib/llm-client";
import { parseJsonResponse } from "@/lib/json-response-parser";
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

          const parsed = parseJsonResponse(accumulated);
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
