"use client";

import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";

interface DiagramRendererProps {
  mermaidCode: string;
}

let mermaidInitialized = false;

function sanitizeMermaidCode(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      // Strip quotes inside square bracket labels: A["Label"] → A[Label]
      return line.replace(/\[\"([^"]*)\"\]/g, "[$1]")
                 .replace(/\[\'([^']*)\'\]/g, "[$1]");
    })
    .join("\n");
}

export function DiagramRenderer({ mermaidCode }: DiagramRendererProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({ startOnLoad: false, theme: "neutral" });
          mermaidInitialized = true;
        }

        const { svg: renderedSvg } = await mermaid.render(
          `diagram-${id}`,
          sanitizeMermaidCode(mermaidCode),
        );

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setSvg("");
          setError("Diagram could not be rendered");
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [id, mermaidCode]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        Visual Diagram
      </p>
      <div className="mt-3 overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
        {error ? (
          <div className="rounded-xl bg-gray-100 p-6 text-sm text-gray-500">
            {error}
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
    </div>
  );
}
