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

  // Extract text from the response
  const textOutput = response.output.find(
    (item: { type: string }) => item.type === "message",
  );
  if (textOutput && "content" in textOutput) {
    const content = (
      textOutput as { content: { type: string; text?: string }[] }
    ).content;
    const textBlock = content.find(
      (block: { type: string }) => block.type === "output_text",
    );
    if (textBlock && "text" in textBlock) {
      return textBlock.text as string;
    }
  }

  return response.output_text ?? "";
}
