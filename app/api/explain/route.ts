import { NextRequest } from "next/server";
import { streamExplanation } from "@/lib/llm-client";
import { paperStore } from "@/lib/paper-store";
import { buildExplainPrompt } from "@/lib/prompt-builder";

export async function POST(req: NextRequest) {
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
        try {
          for await (const chunk of streamExplanation(prompt)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            );
          }

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
