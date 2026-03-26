interface PromptInput {
  pages: { pageNum: number; text: string }[];
  selectedText: string;
  pageNumber: number;
}

function buildContextText(input: PromptInput): string {
  const { pages, selectedText, pageNumber } = input;

  const contextPages = pages.filter(
    (page) => page.pageNum >= pageNumber - 1 && page.pageNum <= pageNumber + 1,
  );

  const contextText = contextPages
    .map((page) => `--- Page ${page.pageNum} ---\n${page.text}`)
    .join("\n\n");

  return `Here is the surrounding context from the paper:

${contextText}

--- HIGHLIGHTED PASSAGE ---
${selectedText}
--- END HIGHLIGHTED PASSAGE ---`;
}

export function buildExplanationOnlyPrompt(input: PromptInput): string {
  return `You are an expert research paper explainer. A user is reading a research paper and has highlighted a specific passage they want to understand better.

${buildContextText(input)}

Formatting rules for the explanation text:
- When you write any math expression, variable, subscript, superscript, summation, integral, matrix, or equation, wrap it in LaTeX delimiters.
- Use inline math for short expressions, like $q$, $k_i$, $v_i$, $s_i = q \\cdot k_i$, and $o = \\sum_i a_i v_i$.
- Use display math for standalone equations with $$...$$.
- Do not write raw plaintext math like "k_i", "sum_i", or "x^2" outside LaTeX delimiters.
- Keep the prose natural, but every mathematical symbol or formula must be valid renderable LaTeX.

Return a JSON object with exactly these keys:
- "summary"
- "coreIdea"
- "intuition"
- "breakdown"

- Keep the summary and core idea tight and direct.
- Keep the intuition to 2-3 sentences.
- Keep the breakdown to 4-6 short sentences.
- Favor clarity and speed over exhaustiveness.`;
}

export function buildExplanationRetryPrompt(input: PromptInput): string {
  return `You are an expert research paper explainer. Read the highlighted passage and return four labeled text sections.

${buildContextText(input)}

Return exactly this format and no extra prose before or after it:

Summary:
<1-2 short sentences>

Core Idea:
<1-2 short sentences>

Intuition:
<2-3 short sentences>

Breakdown:
<4-6 short sentences>

Rules:
- Keep each section as plain readable prose
- Do not output JSON
- Do not use bullet points
- Do not repeat the labels inside the content
- When writing math, use LaTeX delimiters like $q$, $k_i$, and $\\sum_i a_i v_i$`;
}

export function buildMermaidDiagramPrompt(input: PromptInput): string {
  return `You are generating a Mermaid flowchart for a research paper explanation tool.

${buildContextText(input)}

Return a JSON object with exactly these keys:
- "type": must be "mermaid"
- "code": the Mermaid diagram source

Diagram philosophy — what makes a GOOD diagram:
- Focus on the conceptual data flow or decision process described in the passage
- Show how inputs transform into outputs through clear steps
- Show what connects to what and why — relationships, dependencies, data flow
- Do NOT try to reproduce full system architectures, layer stacks, or block diagrams from the paper
- Do NOT try to show internal sub-components of a repeated block — instead show the flow THROUGH the block
- Think: "If I had to explain this passage on a whiteboard with boxes and arrows, what would I draw?"
- A simple, accurate diagram is far better than a complex, wrong one
- Prefer showing 4-6 nodes with meaningful labeled arrows over 8+ nodes with unlabeled connections

Example good diagram topics:
- "How does data flow from input to output?" (not "what are all the internal layers?")
- "What are the key steps in this computation?" (not "reproduce Figure 1")
- "How do these two approaches compare?" (not "show every component of both")

Critical syntax rules — violating any of these will cause a render error:
- Start with "flowchart TD" or "flowchart LR" (no other diagram types)
- Use simple alphanumeric node IDs with NO spaces: A, B, C or node1, node2
- Use square brackets for ALL labels: A[Label Here]
- Do NOT use parentheses (), curly braces {}, or double brackets [[ ]] for labels
- Do NOT put quotes inside labels
- Do NOT use special characters in labels: no &, <, >, ", #, or backticks
- Use only plain English words and hyphens in labels
- Keep labels short (max 5 words)
- Use only these arrow types: -->, --->, -->|label|
- Arrow labels must also be plain text with no special characters
- Max 8 nodes
- Each node definition and each connection must be on its own line
- Do NOT use subgraph`;
}
