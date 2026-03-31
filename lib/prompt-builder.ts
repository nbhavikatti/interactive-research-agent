interface PromptInput {
  pages: { pageNum: number; text: string }[];
  selectedText: string;
  pageNumber: number;
}

interface CrossPaperPromptInput {
  papers: {
    id: string;
    title: string;
    filename: string;
    pages: { pageNum: number; text: string }[];
  }[];
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
    "coreIdea": "The single most important takeaway from this passage in 1-2 sentences of plain English. Focus on conceptual clarity over completeness. Avoid jargon unless necessary. Answer: what is the main point of this paragraph? If the passage is already simple, still distill it into a concise takeaway.",
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

export function buildCrossPaperPrompt(input: CrossPaperPromptInput): string {
  const papersContext = input.papers
    .map((paper) => {
      const excerpts = paper.pages
        .slice(0, 3)
        .map((page) => `--- Page ${page.pageNum} ---\n${page.text.slice(0, 1800)}`)
        .join("\n\n");

      return `=== PAPER ${paper.id} ===
Title: ${paper.title}
Filename: ${paper.filename}

${excerpts}`;
    })
    .join("\n\n");

  return `You are an expert research synthesis assistant. A user uploaded multiple research papers and wants cross-paper insights, comparisons, themes, and idea generation.

Use the paper excerpts below to produce a concise but thoughtful synthesis.

${papersContext}

Respond with raw JSON only using this exact structure:

{
  "overview": "A 3-5 sentence synthesis of the paper set as a whole.",
  "sharedThemes": [
    "Theme 1",
    "Theme 2",
    "Theme 3"
  ],
  "keyDifferences": [
    "Difference 1",
    "Difference 2",
    "Difference 3"
  ],
  "crossPaperOpportunities": [
    "Opportunity 1",
    "Opportunity 2",
    "Opportunity 3"
  ],
  "paperSnapshots": [
    {
      "paperId": "paper id from input",
      "title": "paper title",
      "focus": "1-2 sentence summary of the paper's main focus",
      "notableAngle": "What this paper uniquely contributes relative to the others"
    }
  ]
}

Rules:
- Keep the response grounded in the provided content.
- Mention uncertainties implicitly when evidence is thin rather than inventing details.
- Return 3 to 5 items for sharedThemes, keyDifferences, and crossPaperOpportunities.
- Include one paperSnapshots entry per paper.
- Keep every bullet self-contained and specific.`;
}
