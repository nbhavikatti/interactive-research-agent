export interface ExplanationContent {
  summary: string;
  coreIdea: string;
  intuition: string;
  breakdown: string;
}

export interface ExplanationDiagram {
  type: "mermaid";
  code: string;
}

export interface ExplainViewModel {
  explanation: ExplanationContent | null;
  diagram: ExplanationDiagram | null;
}
