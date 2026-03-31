import { NextRequest } from "next/server";
import { streamResponseText } from "@/lib/llm-client";
import { parseJsonResponse } from "@/lib/json-response-parser";
import { paperStore, StoredPaper } from "@/lib/paper-store";
import { buildCrossPaperPrompt } from "@/lib/prompt-builder";
import {
  MAX_SESSION_PAPERS,
  MIN_ANALYSIS_PAPERS,
} from "@/lib/session-types";
import { rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMIT);
  if (limited) {
    return limited;
  }

  try {
    const payload = (await req.json()) as { paperIds?: string[] };
    const uniquePaperIds = Array.from(new Set(payload.paperIds ?? []));

    if (
      uniquePaperIds.length < MIN_ANALYSIS_PAPERS ||
      uniquePaperIds.length > MAX_SESSION_PAPERS
    ) {
      return new Response(
        JSON.stringify({
          error: `Provide between ${MIN_ANALYSIS_PAPERS} and ${MAX_SESSION_PAPERS} papers.`,
        }),
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500 },
      );
    }

    const papers = await Promise.all(
      uniquePaperIds.map((paperId) => paperStore.get(paperId)),
    );

    if (papers.some((paper) => !paper)) {
      return new Response(JSON.stringify({ error: "One or more papers were not found." }), {
        status: 404,
      });
    }

    const storedPapers = papers.filter(
      (paper): paper is StoredPaper => Boolean(paper),
    );
    const prompt = buildCrossPaperPrompt({
      papers: storedPapers.map((paper) => ({
        id: paper.id,
        title: paper.title,
        filename: paper.filename,
        pages: paper.pages,
      })),
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulated = "";

        try {
          for await (const chunk of streamResponseText(prompt)) {
            accumulated += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            );
          }

          const parsed = parseJsonResponse(accumulated);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ result: parsed })}\n\n`),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Cross-paper analysis failed." })}\n\n`,
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
