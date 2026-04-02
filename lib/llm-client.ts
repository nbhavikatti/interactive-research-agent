import OpenAI from "openai";
import { parseJsonResponse } from "@/lib/json-response-parser";

interface ExtractPaperTitleInput {
  pdfBuffer: Buffer;
  filename: string;
  firstPageText: string;
  topBlocks: string[];
  fallbackTitle: string;
}

interface GenerateStructuredAnalysisResult {
  parsed: Record<string, unknown> | null;
  rawText: string;
}

export async function* streamResponseText(prompt: string): AsyncGenerator<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const stream = await client.responses.create({
    model: "gpt-5",
    input: prompt,
    max_output_tokens: 2000,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      yield event.delta;
    }
  }
}

export async function* streamExplanation(
  prompt: string,
): AsyncGenerator<string> {
  yield* streamResponseText(prompt);
}

export async function generateStructuredAnalysis(
  prompt: string,
): Promise<GenerateStructuredAnalysisResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.parse({
    model: "gpt-5",
    input: prompt,
    max_output_tokens: 2800,
    text: {
      format: {
        type: "json_schema",
        name: "cross_paper_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["overview", "insights", "paperSnapshots"],
          properties: {
            overview: { type: "string" },
            insights: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "insight", "whyItMatters", "references"],
                properties: {
                  title: { type: "string" },
                  insight: { type: "string" },
                  whyItMatters: { type: "string" },
                  references: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "paperId",
                        "filename",
                        "paperTitle",
                        "pageNumber",
                        "section",
                        "snippet",
                      ],
                      properties: {
                        paperId: { type: "string" },
                        filename: { type: "string" },
                        paperTitle: { type: "string" },
                        pageNumber: {
                          anyOf: [{ type: "integer" }, { type: "null" }],
                        },
                        section: {
                          anyOf: [{ type: "string" }, { type: "null" }],
                        },
                        snippet: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
            paperSnapshots: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["paperId", "title", "focus", "notableAngle"],
                properties: {
                  paperId: { type: "string" },
                  title: { type: "string" },
                  focus: { type: "string" },
                  notableAngle: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  });

  const rawText = response.output_text ?? "";
  const parsed =
    (response.output_parsed as Record<string, unknown> | null | undefined) ??
    parseJsonResponse(rawText);

  return {
    parsed,
    rawText,
  };
}

export async function extractPaperTitle({
  pdfBuffer,
  filename,
  firstPageText,
  topBlocks,
  fallbackTitle,
}: ExtractPaperTitleInput): Promise<string | null> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const topBlockText = topBlocks
    .slice(0, 8)
    .map((block, index) => `${index + 1}. ${block}`)
    .join("\n");

  const firstPageExcerpt = firstPageText.slice(0, 6000);

  const response = await client.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content:
          "You identify the exact title of an academic paper from the provided PDF. Inspect the first page visually and use the PDF text as supporting context. Return only the paper title text with no quotes, labels, markdown, or explanation. Ignore authors, affiliations, headers, footers, conference names, dates, running heads, and section headings.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename,
            file_data: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
          },
          {
            type: "input_text",
            text: `Identify the exact title of this academic paper.

Prioritize the title shown on page 1.
Use the PDF rendering itself as the source of truth, and use these extracted signals only as backup context.

Candidate high-visibility text blocks from the top of page 1:
${topBlockText || "None"}

First page text excerpt:
${firstPageExcerpt}

Fallback heuristic title:
${fallbackTitle}

Return only the exact paper title.`,
          },
        ],
      },
    ],
    max_output_tokens: 120,
  });

  const title = response.output_text?.trim();
  if (!title) {
    return null;
  }

  const cleaned = title
    .replace(/^title:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

  if (!cleaned || cleaned.length > 220) {
    return null;
  }

  return cleaned;
}
