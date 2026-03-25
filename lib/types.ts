/** Visualization routing types */

export type VisualizationRoute = "static_diagram" | "manim_animation";

export interface ClassifierResult {
  route: VisualizationRoute;
  reason: string;
}

export interface AnimationStep {
  step: number;
  action: string;
  description: string;
}

export interface AnimationSpec {
  title: string;
  concept_summary: string;
  scene_goal: string;
  visual_objects: string[];
  animation_steps: AnimationStep[];
  labels: string[];
  equations: string[];
  narration_notes: string;
  estimated_duration_seconds: number;
  complexity_level: "basic" | "intermediate" | "advanced";
}

export interface ManimResult {
  animation_spec: AnimationSpec;
  manim_code: string;
}

export interface ExplanationDiagram {
  type: "mermaid";
  code: string;
}

export interface ManimDiagram {
  type: "manim";
  animation_spec: AnimationSpec;
  code: string;
}

export type DiagramResult = ExplanationDiagram | ManimDiagram;
