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
 * Reuses the proven streaming path and collects all chunks into a single string.
 */
export async function generateCompletion(
  prompt: string,
  maxTokens: number = 1000,
): Promise<string> {
  const client = getClient();

  const stream = await client.responses.create({
    model: "gpt-5",
    input: prompt,
    max_output_tokens: maxTokens,
    stream: true,
  });

  let result = "";
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      result += event.delta;
    }
  }

  return result;
}
