import OpenAI from "openai";
import { parseJsonResponse } from "@/lib/json-response-parser";

interface ExtractPaperTitleInput {
  firstPageImage: string;
  fallbackTitle: string;
}

export interface ExtractPaperTitleResult {
  cleanedTitle: string | null;
  rawOutput: string;
  responseDebug: Record<string, unknown>;
}

interface GenerateStructuredAnalysisResult {
  parsed: Record<string, unknown> | null;
  rawText: string;
  responseDebug: Record<string, unknown>;
}

const TITLE_MAX_OUTPUT_TOKENS = 600;
const CROSS_PAPER_MAX_OUTPUT_TOKENS = 3000;

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
    max_output_tokens: CROSS_PAPER_MAX_OUTPUT_TOKENS,
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

  const fallbackOutputText = response.output
    .flatMap((item) =>
      "content" in item && Array.isArray(item.content)
        ? item.content.flatMap((contentItem) =>
            "text" in contentItem && typeof contentItem.text === "string"
              ? [contentItem.text]
              : [],
          )
        : [],
    )
    .join("\n")
    .trim();

  const rawText = response.output_text?.trim() || fallbackOutputText;
  const parsed =
    (response.output_parsed as Record<string, unknown> | null | undefined) ??
    parseJsonResponse(rawText);

  const responseDebug = {
    id: response.id,
    incompleteDetails: response.incomplete_details ?? null,
    model: response.model,
    output: response.output.map((item) => ({
      id: item.id,
      role: "role" in item ? item.role : null,
      status: "status" in item ? item.status ?? null : null,
      type: item.type,
      content:
        "content" in item && Array.isArray(item.content)
          ? item.content.map((contentItem) => ({
              text:
                "text" in contentItem && typeof contentItem.text === "string"
                  ? contentItem.text
                  : null,
              type: contentItem.type,
            }))
          : null,
    })),
    configuredMaxOutputTokens: CROSS_PAPER_MAX_OUTPUT_TOKENS,
    outputParsedPresent: Boolean(response.output_parsed),
    outputText: response.output_text ?? "",
    rawText,
    status: response.status,
    usage: response.usage ?? null,
  };

  return {
    parsed,
    rawText,
    responseDebug,
  };
}

export async function extractPaperTitle({
  firstPageImage,
  fallbackTitle,
}: ExtractPaperTitleInput): Promise<ExtractPaperTitleResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content:
          "You identify the exact title of an academic paper from an image of the first page. Return only the paper title text with no quotes, labels, markdown, or explanation. Ignore authors, affiliations, headers, footers, copyright notices, attribution text, conference names, dates, and section headings.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `This is page 1 of a research paper. Read the image and return only the exact title of the paper.

Do not return attribution text, copyright notices, submission notices, author names, affiliations, or headers.

If the title is ambiguous, prefer the main large centered title text over any smaller notice text.

Fallback heuristic title: ${fallbackTitle}`,
          },
          {
            type: "input_image",
            image_url: firstPageImage,
            detail: "high",
          },
        ],
      },
    ],
    max_output_tokens: TITLE_MAX_OUTPUT_TOKENS,
  });

  const rawOutput = response.output_text?.trim() ?? "";
  const responseDebug = {
    id: response.id,
    incompleteDetails: response.incomplete_details ?? null,
    model: response.model,
    output: response.output.map((item) => ({
      id: item.id,
      role: "role" in item ? item.role : null,
      status: "status" in item ? item.status ?? null : null,
      type: item.type,
      content:
        "content" in item && Array.isArray(item.content)
          ? item.content.map((contentItem) => ({
              text:
                "text" in contentItem && typeof contentItem.text === "string"
                  ? contentItem.text
                  : null,
              type: contentItem.type,
            }))
          : null,
    })),
    configuredMaxOutputTokens: TITLE_MAX_OUTPUT_TOKENS,
    outputText: response.output_text ?? "",
    status: response.status,
    usage: response.usage ?? null,
  };

  const title = rawOutput;
  if (!title) {
    return {
      cleanedTitle: null,
      rawOutput,
      responseDebug,
    };
  }

  const cleaned = title
    .replace(/^title:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

  if (!cleaned || cleaned.length > 220) {
    return {
      cleanedTitle: null,
      rawOutput,
      responseDebug,
    };
  }

  return {
    cleanedTitle: cleaned,
    rawOutput,
    responseDebug,
  };
}
