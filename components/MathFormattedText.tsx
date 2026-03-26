"use client";

import katex from "katex";

interface MathFormattedTextProps {
  content: string;
  className?: string;
}

function fixLatexEscapes(expr: string): string {
  // JSON.parse can corrupt LaTeX backslash-commands when the model doesn't
  // double-escape in JSON. For example \text becomes <tab>ext because JSON
  // interprets \t as a tab, \n as a newline, \r as a carriage return, etc.
  // Fix: replace any control character followed by letters back to backslash + letter + rest.
  return expr.replace(
    /[\t\n\r]([a-zA-Z])/g,
    (_match, letter: string) => {
      const controlChar = _match[0];
      const prefix =
        controlChar === "\t" ? "t" :
        controlChar === "\n" ? "n" :
        "r";
      return "\\" + prefix + letter;
    },
  );
}

function renderMath(expression: string, displayMode: boolean, key: string) {
  const html = katex.renderToString(fixLatexEscapes(expression.trim()), {
    displayMode,
    strict: "ignore",
    throwOnError: false,
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} key={key} />;
}

/**
 * Fixes inline math blocks that accidentally contain natural-language prose.
 * e.g. "$z = f(x) and the output is y$" → "$z = f(x)$ and the output is $y$"
 *
 * Heuristic: if an inline $...$ block contains common English words that aren't
 * part of LaTeX commands (\text{...}, \mathrm{...}, etc.), split them out.
 */
function fixMixedMathProse(text: string): string {
  // Match inline math (not display math $$...$$)
  return text.replace(/\$([^$\n]+?)\$/g, (_match, inner: string) => {
    // Don't touch expressions that are purely math (no spaces or very short)
    if (inner.length < 10) return _match;

    // Strip out LaTeX command arguments like \text{...}, \mathrm{...}, etc.
    // so we don't flag English words inside those commands
    const withoutTextCommands = inner.replace(
      /\\(?:text|mathrm|mathit|mathbf|operatorname|mbox)\{[^}]*\}/g,
      "",
    );

    // Common English words that should not appear bare inside math mode
    const proseWords =
      /\b(?:the|and|or|is|are|was|were|in|on|at|to|for|of|by|from|with|that|this|each|where|which|when|then|into|also|not|its|all|any|has|have|can|will|does|over|such)\b/i;

    if (!proseWords.test(withoutTextCommands)) return _match;

    // The expression mixes math and prose. Split on prose word boundaries:
    // Find segments that are math vs prose and re-wrap only the math parts.
    const segments = inner.split(
      /(\b(?:the|and|or|is|are|was|were|in|on|at|to|for|of|by|from|with|that|this|each|where|which|when|then|into|also|not|its|all|any|has|have|can|will|does|over|such)\b[\s,;:.]*)/i,
    );

    let result = "";
    let mathBuffer = "";

    for (const seg of segments) {
      const isProse = proseWords.test(seg);
      if (!isProse && seg.trim()) {
        mathBuffer += seg;
      } else {
        if (mathBuffer.trim()) {
          result += `$${mathBuffer.trim()}$`;
          mathBuffer = "";
        }
        result += seg;
      }
    }

    if (mathBuffer.trim()) {
      result += `$${mathBuffer.trim()}$`;
    }

    return result;
  });
}

function renderInlineContent(text: string) {
  const parts: React.ReactNode[] = [];
  const sanitized = fixMixedMathProse(text);
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  match = pattern.exec(sanitized);
  while (match) {
    if (match.index > lastIndex) {
      parts.push(sanitized.slice(lastIndex, match.index));
    }

    const token = match[0];
    const isDisplay = token.startsWith("$$");
    const expression = token.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1);

    parts.push(
      renderMath(expression, isDisplay, `math-${match.index}-${expression}`),
    );

    lastIndex = match.index + token.length;
    match = pattern.exec(sanitized);
  }

  if (lastIndex < sanitized.length) {
    parts.push(sanitized.slice(lastIndex));
  }

  return parts;
}

export function MathFormattedText({
  content,
  className,
}: MathFormattedTextProps) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, paragraphIndex) => {
        const trimmedParagraph = paragraph.trim();
        const displayMathMatch = trimmedParagraph.match(/^\$\$([\s\S]+)\$\$$/);

        if (displayMathMatch) {
          return (
            <div className="my-3 overflow-x-auto" key={`paragraph-${paragraphIndex}`}>
              {renderMath(
                displayMathMatch[1],
                true,
                `display-${paragraphIndex}`,
              )}
            </div>
          );
        }

        const lines = paragraph.split("\n");

        return (
          <p className="my-0" key={`paragraph-${paragraphIndex}`}>
            {lines.map((line, lineIndex) => (
              <span key={`line-${paragraphIndex}-${lineIndex}`}>
                {renderInlineContent(line)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
