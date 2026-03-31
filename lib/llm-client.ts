import OpenAI from "openai";

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
