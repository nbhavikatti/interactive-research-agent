interface PromptInput {
  pages: { pageNum: number; text: string }[];
  selectedText: string;
  pageNumber: number;
}

export function buildExplainPrompt(input: PromptInput): string {
  const { pages, selectedText, pageNumber } = input;

  const contextPages = pages.filter(
    (page) => page.pageNum >= pageNumber - 1 && page.pageNum <= pageNumber + 1,
  );

  const contextText = contextPages
    .map((page) => `--- Page ${page.pageNum} ---\n${page.text}`)
    .join("\n\n");

  return `You are an expert research paper explainer. A user is reading a research paper and has highlighted a specific passage they want to understand better.

Here is the surrounding context from the paper:

${contextText}

--- HIGHLIGHTED PASSAGE ---
${selectedText}
--- END HIGHLIGHTED PASSAGE ---

Respond with a JSON object (no markdown code fences, just raw JSON) with this exact structure:

{
  "explanation": {
    "summary": "A 1-2 sentence plain-language summary of what this passage means",
    "intuition": "An intuitive explanation that helps build understanding. Use analogies if helpful. 2-4 sentences.",
    "breakdown": "A detailed step-by-step breakdown of the passage. For math/formulas, explain each term. For concepts, explain the logic. 3-6 sentences."
  },
  "diagram": {
    "type": "mermaid",
    "code": "A valid Mermaid.js diagram that visually represents the concept. Use graph TD for flowcharts, sequenceDiagram for processes, or stateDiagram-v2 for state transitions. Keep it simple, max 8-10 nodes. Do NOT use special characters or parentheses inside node labels."
  }
}

Important rules for the Mermaid diagram:
- Use simple alphanumeric node IDs (A, B, C or node1, node2)
- Keep node labels short (max 6 words per label)
- Use square brackets for labels: A[Label Here]
- Do NOT use parentheses, quotes, or special characters in labels
- Max 10 nodes
- Must be valid Mermaid syntax`;
}
