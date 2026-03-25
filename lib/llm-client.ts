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
 * Collects streaming deltas, with a fallback to extract text from the
 * completed response event if no deltas were received.
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
  let completedOutput: unknown[] | null = null;

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      result += event.delta;
    }

    // Capture the completed response output as fallback
    if (
      event.type === "response.completed" ||
      event.type === "response.incomplete"
    ) {
      const resp = (event as unknown as Record<string, unknown>)
        .response as Record<string, unknown> | undefined;
      if (resp?.output) {
        completedOutput = resp.output as unknown[];
      }
    }
  }

  // If streaming deltas worked, use that
  if (result) {
    return result;
  }

  // Fallback: extract text from the completed response output array
  if (completedOutput) {
    for (const item of completedOutput) {
      const obj = item as Record<string, unknown>;
      if (obj.type === "message" && Array.isArray(obj.content)) {
        for (const block of obj.content) {
          const b = block as Record<string, unknown>;
          if (b.type === "output_text" && typeof b.text === "string") {
            return b.text;
          }
        }
      }
    }
  }

  return "";
}
