import type { AnimationSpec } from "@/lib/types";

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

export function buildClassifierPrompt(input: PromptInput): string {
  return `You are a visualization routing classifier for a research paper explanation tool.

A user highlighted a passage from a research paper. Your job is to decide whether the concept is best explained with:
- "static_diagram": A static Mermaid.js diagram (flowchart, concept map, state diagram)
- "manim_animation": A short animated visualization (Manim/3Blue1Brown style)

${buildContextText(input)}

Choose "manim_animation" if the passage involves ANY of:
- Mathematical equations, formulas, symbols, matrices, summations, integrals
- Iterative procedures, optimization steps, gradient descent, convergence
- Transformations that happen over time or in sequence (attention, diffusion, message passing)
- Algorithmic processes where step-by-step animation aids understanding
- Concepts where motion, change, or progression is key to understanding
- Forward/backward passes, backpropagation, loss landscapes

Choose "static_diagram" if the passage involves ANY of:
- System architecture, component relationships, taxonomies
- Qualitative comparisons, categories, hierarchies
- Simple concept maps or relationship diagrams
- Definitions, terminology, or descriptive overviews
- High-level pipeline descriptions without mathematical detail

Respond with a JSON object (no markdown code fences, just raw JSON):

{
  "route": "static_diagram" or "manim_animation",
  "reason": "One sentence explaining why this route was chosen"
}`;
}

export function buildExplainPrompt(input: PromptInput): string {
  return `You are an expert research paper explainer. A user is reading a research paper and has highlighted a specific passage they want to understand better.

${buildContextText(input)}

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

export function buildExplainWithManimPrompt(input: PromptInput): string {
  return `You are an expert research paper explainer. A user is reading a research paper and has highlighted a specific passage they want to understand better.

${buildContextText(input)}

Respond with a JSON object (no markdown code fences, just raw JSON) with this exact structure:

{
  "explanation": {
    "summary": "A 1-2 sentence plain-language summary of what this passage means",
    "coreIdea": "The single most important takeaway from this passage in 1-2 sentences of plain English. Focus on conceptual clarity over completeness. Avoid jargon unless necessary.",
    "intuition": "An intuitive explanation that helps build understanding. Use analogies if helpful. 2-4 sentences.",
    "breakdown": "A detailed step-by-step breakdown of the passage. For math/formulas, explain each term. For concepts, explain the logic. 3-6 sentences."
  },
  "diagram": {
    "type": "manim",
    "animation_spec": {
      "title": "Short title for the animation",
      "concept_summary": "One sentence summary of what this animation shows",
      "scene_goal": "What the viewer should understand after watching",
      "visual_objects": ["List of visual elements needed: shapes, axes, arrows, text, etc."],
      "animation_steps": [
        {"step": 1, "action": "Create/FadeIn/Transform/etc", "description": "What happens in this step"}
      ],
      "labels": ["Important labels to show on screen"],
      "equations": ["LaTeX equations to display, if any"],
      "narration_notes": "What a narrator would say during this animation",
      "estimated_duration_seconds": 7,
      "complexity_level": "basic or intermediate or advanced"
    },
    "code": "MANIM_CODE_PLACEHOLDER"
  }
}

For the animation_spec:
- Keep it to 3-8 animation steps
- Target 5-10 seconds total duration
- Use basic/intermediate complexity unless the concept demands advanced
- List all visual objects that will appear

For the code field, write "MANIM_CODE_PLACEHOLDER" — the actual Manim code will be generated in a follow-up step.`;
}

export function buildManimCodePrompt(spec: AnimationSpec): string {
  return `You are an expert Manim programmer. Generate a short, simple, robust Manim Community Edition scene based on this animation specification.

Animation Specification:
- Title: ${spec.title}
- Concept: ${spec.concept_summary}
- Goal: ${spec.scene_goal}
- Visual Objects: ${spec.visual_objects.join(", ")}
- Steps:
${spec.animation_steps.map((s) => `  ${s.step}. [${s.action}] ${s.description}`).join("\n")}
- Labels: ${spec.labels.join(", ")}
- Equations: ${spec.equations.join(", ") || "none"}
- Duration Target: ~${spec.estimated_duration_seconds} seconds
- Complexity: ${spec.complexity_level}

Respond with ONLY a JSON object (no markdown code fences):

{
  "manim_code": "the complete Python code for the Manim scene"
}

Rules for the Manim code:
- Use Manim Community Edition (from manim import *)
- Create a single Scene subclass called ConceptScene
- Keep it SHORT — 30-80 lines max
- Target ${spec.estimated_duration_seconds} seconds of animation
- Use self.play() with simple animations: FadeIn, FadeOut, Write, Transform, Create, MoveToTarget, Indicate
- Use self.wait() sparingly (0.5-1 second)
- Prefer basic shapes: Circle, Square, Rectangle, Arrow, Line, Dot, Text, MathTex, Tex
- Use VGroup for grouping related objects
- Position objects explicitly with .move_to(), .next_to(), .shift()
- Use simple color constants: RED, BLUE, GREEN, YELLOW, WHITE, ORANGE, PURPLE
- Do NOT use complex 3D scenes, cameras, or advanced features
- Do NOT import external libraries beyond manim
- Do NOT use file I/O or network calls
- The code must be self-contained and executable with: manim -pql scene.py ConceptScene
- Handle edge cases: ensure text fits on screen, objects don't overlap excessively`;
}
