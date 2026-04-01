import OpenAI from "openai";

interface ExtractPaperTitleInput {
  firstPageText: string;
  topBlocks: string[];
  fallbackTitle: string;
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

export async function extractPaperTitle({
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
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You identify the exact title of an academic paper from first-page PDF text. Return only the paper title text with no quotes, labels, markdown, or explanation. Ignore authors, affiliations, headers, conference names, dates, and section headings.",
      },
      {
        role: "user",
        content: `Candidate high-visibility text blocks from the top of page 1:
${topBlockText || "None"}

First page text excerpt:
${firstPageExcerpt}

Fallback heuristic title:
${fallbackTitle}

Return only the exact paper title.`,
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
