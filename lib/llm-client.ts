import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const explanationContentSchema = z.object({
  summary: z.string(),
  coreIdea: z.string(),
  intuition: z.string(),
  breakdown: z.string(),
});

export const mermaidDiagramSchema = z.object({
  type: z.literal("mermaid"),
  code: z.string(),
});

export class StructuredGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredGenerationError";
  }
}

/**
 * Generate a structured object using gpt-5 with low reasoning effort.
 * Used for explanation content where quality matters.
 */
export async function generateStructuredObject<T>(
  prompt: string,
  schema: z.ZodType<T>,
  schemaName: string,
  maxTokens: number,
): Promise<T> {
  const client = getClient();

  const response = await client.responses.create({
    model: "gpt-5",
    input: prompt,
    max_output_tokens: maxTokens,
    reasoning: { effort: "low" },
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });

  const rawText = extractResponseText(response);
  const fallbackParsed = parseStructuredText(rawText, schema);
  if (fallbackParsed) {
    return fallbackParsed;
  }

  throw new StructuredGenerationError(
    `Model did not return a valid ${schemaName} payload.`,
  );
}

/**
 * Generate a structured object using gpt-4o (fast, no reasoning overhead).
 * Used for diagram generation where speed matters more than depth.
 */
export async function generateStructuredObjectFast<T>(
  prompt: string,
  schema: z.ZodType<T>,
  schemaName: string,
  maxTokens: number,
): Promise<T> {
  const client = getClient();

  const response = await client.responses.create({
    model: "gpt-4o",
    input: prompt,
    max_output_tokens: maxTokens,
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });

  const rawText = extractResponseText(response);
  const fallbackParsed = parseStructuredText(rawText, schema);
  if (fallbackParsed) {
    return fallbackParsed;
  }

  throw new StructuredGenerationError(
    `Model did not return a valid ${schemaName} payload.`,
  );
}

export function parseStructuredText<T>(
  rawText: string,
  schema: z.ZodType<T>,
): T | null {
  if (!rawText) {
    return null;
  }

  const candidates = [
    rawText,
    rawText
      .replace(/^```(?:json)?\s*\n?/m, "")
      .replace(/\n?```\s*$/m, ""),
  ];

  for (const candidate of candidates) {
    try {
      return schema.parse(JSON.parse(candidate));
    } catch {
      // continue
    }

    const match = candidate.match(/\{[\s\S]*\}/);
    if (!match) {
      continue;
    }

    try {
      return schema.parse(JSON.parse(match[0]));
    } catch {
      try {
        return schema.parse(JSON.parse(escapeControlCharsInStrings(match[0])));
      } catch {
        // continue
      }
    }
  }

  return null;
}

function extractResponseText(
  response: {
    output_text?: string;
    output?: unknown[];
  },
): string {
  if (response.output_text) {
    return response.output_text;
  }

  const chunks: string[] = [];

  for (const item of response.output ?? []) {
    const message = item as {
      type?: string;
      content?: unknown[];
    };

    if (message.type !== "message" || !Array.isArray(message.content)) {
      continue;
    }

    for (const block of message.content) {
      const outputBlock = block as {
        type?: string;
        text?: string;
      };

      if (
        outputBlock.type === "output_text" &&
        typeof outputBlock.text === "string"
      ) {
        chunks.push(outputBlock.text);
      }
    }
  }

  return chunks.join("");
}

function escapeControlCharsInStrings(text: string): string {
  let result = "";
  let inString = false;

  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];

    if (ch === '"') {
      let backslashes = 0;
      for (let scan = index - 1; scan >= 0 && text[scan] === "\\"; scan -= 1) {
        backslashes += 1;
      }
      if (backslashes % 2 === 0) {
        inString = !inString;
      }
      result += ch;
      continue;
    }

    if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * Non-streaming completion using gpt-5 with low reasoning effort.
 * Used as a fallback for explanation retry.
 */
export async function generateCompletion(
  prompt: string,
  maxTokens: number = 1000,
): Promise<string> {
  const client = getClient();
  const response = await client.responses.create({
    model: "gpt-5",
    input: prompt,
    max_output_tokens: maxTokens,
    reasoning: { effort: "low" },
  });

  return response.output_text ?? "";
}
