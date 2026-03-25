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
    // Log terminal events to debug empty responses
    if (
      event.type === "response.completed" ||
      event.type === "response.incomplete" ||
      event.type === "response.failed"
    ) {
      const resp = (event as unknown as Record<string, unknown>).response as Record<string, unknown> | undefined;
      console.error(
        `[generateCompletion] Stream ended: ${event.type}`,
        "status:", resp?.status,
        "incomplete_details:", JSON.stringify((resp as Record<string,unknown>)?.incomplete_details ?? null),
        "error:", JSON.stringify(resp?.error ?? null),
        "output:", JSON.stringify(resp?.output)?.slice(0, 500),
      );
    }
  }

  return result;
}
