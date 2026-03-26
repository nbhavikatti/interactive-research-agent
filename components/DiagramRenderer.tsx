"use client";

import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";

interface DiagramRendererProps {
  mermaidCode: string;
}

let mermaidInitialized = false;

/**
 * Aggressively sanitize LLM-generated mermaid code to fix common syntax mistakes.
 */
function sanitizeMermaidCode(code: string): string {
  let lines = code.split("\n");

  // Ensure first non-empty line is a valid flowchart declaration
  const firstContentIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstContentIdx >= 0) {
    const first = lines[firstContentIdx].trim().toLowerCase();
    if (!first.startsWith("flowchart") && !first.startsWith("graph")) {
      lines.splice(firstContentIdx, 0, "flowchart TD");
    }
  }

  lines = lines.map((line) => {
    // Strip quotes inside square bracket labels: A["Label"] → A[Label]
    line = line.replace(/\["([^"]*)"\]/g, "[$1]");
    line = line.replace(/\['([^']*)'\]/g, "[$1]");

    // Convert parentheses labels to square brackets: A(Label) → A[Label]
    // but NOT subgraph or flowchart directives
    if (!line.trim().startsWith("flowchart") && !line.trim().startsWith("graph") && !line.trim().startsWith("subgraph")) {
      line = line.replace(/(\w)\(([^)]+)\)/g, "$1[$2]");
    }

    // Convert double brackets [[Label]] to single [Label]
    line = line.replace(/\[\[([^\]]*)\]\]/g, "[$1]");

    // Convert curly brace labels {Label} to [Label] (rhombus → rectangle)
    line = line.replace(/\{([^}]*)\}/g, "[$1]");

    // Strip HTML entities and special chars from labels inside brackets
    line = line.replace(/\[([^\]]*)\]/g, (_match, label: string) => {
      const cleaned = label
        .replace(/&amp;/g, "and")
        .replace(/&lt;/g, "")
        .replace(/&gt;/g, "")
        .replace(/&/g, "and")
        .replace(/</g, "")
        .replace(/>/g, "")
        .replace(/#/g, "")
        .replace(/`/g, "")
        .replace(/"/g, "")
        .replace(/'/g, "");
      return `[${cleaned}]`;
    });

    // Strip special chars from arrow labels -->|label|
    line = line.replace(/-->\|([^|]*)\|/g, (_match, label: string) => {
      const cleaned = label
        .replace(/&/g, "and")
        .replace(/</g, "")
        .replace(/>/g, "")
        .replace(/#/g, "")
        .replace(/`/g, "")
        .replace(/"/g, "")
        .replace(/'/g, "");
      return `-->|${cleaned}|`;
    });

    // Fix node IDs with spaces by collapsing them: "Node A[Label]" → "NodeA[Label]"
    line = line.replace(/^(\s*)(\w+(?:\s+\w+)+)(\[)/g, (_match, indent: string, idPart: string, bracket: string) => {
      return `${indent}${idPart.replace(/\s+/g, "")}${bracket}`;
    });

    // Remove subgraph lines (often cause errors)
    if (line.trim().startsWith("subgraph") || line.trim() === "end") {
      return "";
    }

    return line;
  });

  return lines.filter((l) => l.trim().length > 0 || l === "").join("\n");
}

export function DiagramRenderer({ mermaidCode }: DiagramRendererProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;

    const tryRender = async (code: string): Promise<string> => {
      // Mermaid leaves zombie elements in the DOM on failed renders — clean them up
      const zombieSvg = document.getElementById(`diagram-${id}`);
      if (zombieSvg) zombieSvg.remove();

      return (await mermaid.render(`diagram-${id}`, code)).svg;
    };

    const renderDiagram = async () => {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
          });
          mermaidInitialized = true;
        }

        const sanitized = sanitizeMermaidCode(mermaidCode);

        let renderedSvg: string | null = null;

        // Attempt 1: render sanitized code
        try {
          renderedSvg = await tryRender(sanitized);
        } catch {
          // Attempt 2: strip all arrow labels (common source of parse errors)
          retryCount++;
          const simplified = sanitized
            .replace(/-->\|[^|]*\|/g, "-->")
            .replace(/-+>\|[^|]*\|/g, "-->");
          try {
            renderedSvg = await tryRender(simplified);
          } catch {
            // Attempt 3: minimal skeleton — just nodes and plain arrows
            retryCount++;
            const minimalLines = simplified.split("\n").filter((l) => {
              const t = l.trim();
              return (
                t.startsWith("flowchart") ||
                t.startsWith("graph") ||
                /^\w+\[/.test(t) ||
                /^\w+\s*-->/.test(t)
              );
            });
            if (minimalLines.length > 1) {
              renderedSvg = await tryRender(minimalLines.join("\n"));
            }
          }
        }

        if (!cancelled && renderedSvg) {
          setSvg(renderedSvg);
          setError(null);
        } else if (!cancelled) {
          // All render attempts failed — show raw code as fallback
          setSvg("");
          setError("fallback");
        }
      } catch {
        if (!cancelled) {
          setSvg("");
          setError("fallback");
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [id, mermaidCode]);

  if (error === "fallback") {
    // Show raw mermaid code so the user still gets value
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Visual Diagram
        </p>
        <div className="mt-3 overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono leading-relaxed">
            {sanitizeMermaidCode(mermaidCode)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        Visual Diagram
      </p>
      <div className="mt-3 overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        )}
      </div>
    </div>
  );
}
