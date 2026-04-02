import { NextRequest } from "next/server";
import { generateExplanation } from "@/lib/llm-client";
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

    const result = await generateExplanation(prompt);

    if (!result.parsed) {
      return new Response(
        JSON.stringify({
          error: "Could not parse the explanation.",
          debug: {
            rawOutputPreview: result.rawText.slice(0, 1200),
          },
          llmResponseDebug: result.responseDebug,
        }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        result: result.parsed,
        llmResponseDebug: result.responseDebug,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (errorValue) {
    const message =
      errorValue instanceof Error ? errorValue.message : "Explain request failed.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
}
