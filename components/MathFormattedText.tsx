"use client";

import katex from "katex";

interface MathFormattedTextProps {
  content: string;
  className?: string;
}

function renderMath(expression: string, displayMode: boolean, key: string) {
  const html = katex.renderToString(expression.trim(), {
    displayMode,
    strict: "ignore",
    throwOnError: false,
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} key={key} />;
}

function renderInlineContent(text: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  match = pattern.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const isDisplay = token.startsWith("$$");
    const expression = token.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1);

    parts.push(
      renderMath(expression, isDisplay, `math-${match.index}-${expression}`),
    );

    lastIndex = match.index + token.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
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
