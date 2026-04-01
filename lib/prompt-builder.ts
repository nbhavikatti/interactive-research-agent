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
        .slice(0, 5)
        .map((page) => `--- Page ${page.pageNum} ---\n${page.text.slice(0, 1400)}`)
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

Return valid JSON only. Do not wrap the response in markdown fences.
Every insight must be grounded in at least one supporting reference from the provided paper excerpts.
If page numbers are available from the excerpt headers, include them. If section names are not available, use null.

Use exactly this structure:

{
  "overview": "A 3-5 sentence synthesis of the paper set as a whole.",
  "insights": [
    {
      "title": "A short insight title",
      "insight": "The actual cross-paper insight.",
      "whyItMatters": "Why this matters for understanding or decision-making.",
      "references": [
        {
          "paperId": "paper id from input",
          "filename": "filename from input",
          "paperTitle": "paper title from input",
          "pageNumber": 1,
          "section": null,
          "snippet": "Short supporting excerpt copied or tightly paraphrased from the provided paper text."
        }
      ]
    }
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
- Mention uncertainties explicitly when evidence is thin rather than inventing details.
- Return 4 to 6 insight objects.
- Include one paperSnapshots entry per paper.
- Each insight must include 1 to 3 references.
- Use exact paper ids, filenames, and titles from the input.
- Keep snippets short, specific, and attributable.
- Do not invent page numbers.
- If a field is unknown, use null instead of omitting it.`;
}
