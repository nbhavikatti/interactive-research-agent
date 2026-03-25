import OpenAI from "openai";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function* streamExplanation(
  prompt: string,
): AsyncGenerator<string> {
  const client = getClient();

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

/**
 * Non-streaming completion for classification and code generation steps.
 * Uses a lower max_output_tokens for the classifier, higher for code gen.
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
  });

  // The Responses API puts the text in output_text at the top level
  if (response.output_text) {
    return response.output_text;
  }

  // Fallback: walk the output array manually
  for (const item of response.output) {
    if (item.type === "message" && "content" in item) {
      const content = item.content as { type: string; text?: string }[];
      for (const block of content) {
        if (block.type === "output_text" && block.text) {
          return block.text;
        }
      }
    }
  }

  console.error(
    "[generateCompletion] Could not extract text. Response output:",
    JSON.stringify(response.output, null, 2),
  );
  return "";
}
