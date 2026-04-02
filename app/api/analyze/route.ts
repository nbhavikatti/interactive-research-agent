import { NextRequest, NextResponse } from "next/server";
import { normalizeCrossPaperAnalysis } from "@/lib/cross-paper-analysis";
import { generateStructuredAnalysis } from "@/lib/llm-client";
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
      return NextResponse.json(
        {
          error: `Provide between ${MIN_ANALYSIS_PAPERS} and ${MAX_SESSION_PAPERS} papers.`,
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const papers = await Promise.all(
      uniquePaperIds.map((paperId) => paperStore.get(paperId)),
    );

    if (papers.some((paper) => !paper)) {
      return NextResponse.json(
        { error: "One or more papers were not found." },
        { status: 404 },
      );
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

    const { parsed, rawText, responseDebug } = await generateStructuredAnalysis(prompt);
    const normalized = normalizeCrossPaperAnalysis({
      raw: parsed,
      rawOutput: rawText,
    });

    if (!normalized.result) {
      console.error("Cross-paper analysis parse failed", {
        paperIds: uniquePaperIds,
        rawOutputPreview: rawText.slice(0, 4000),
      });

      return NextResponse.json(
        {
          debug: normalized.debug,
          llmResponseDebug: responseDebug,
          error: "Could not parse the cross-paper analysis.",
        },
        { status: 502 },
      );
    }

    if (normalized.debug.parseWarning) {
      console.warn("Cross-paper analysis partially normalized", {
        paperIds: uniquePaperIds,
        parseWarning: normalized.debug.parseWarning,
        rawOutputPreview: rawText.slice(0, 2000),
      });
    }

    return NextResponse.json({
      debug: normalized.debug,
      llmResponseDebug: responseDebug,
      result: normalized.result,
    });
  } catch (error) {
    console.error("Cross-paper analysis request failed", error);
    return NextResponse.json(
      { error: "Cross-paper analysis failed." },
      { status: 500 },
    );
  }
}
