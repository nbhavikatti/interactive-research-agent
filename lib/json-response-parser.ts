export function parseJsonResponse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    // noop
  }

  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "");

  try {
    return JSON.parse(stripped);
  } catch {
    // noop
  }

  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(escapeControlCharsInStrings(match[0]));
    } catch {
      // noop
    }
  }

  return null;
}

function escapeControlCharsInStrings(text: string): string {
  let result = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && text[j] === "\\"; j--) {
        backslashes++;
      }
      if (backslashes % 2 === 0) {
        inString = !inString;
      }
      result += ch;
      continue;
    }

    if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else {
        result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
      }
      continue;
    }

    result += ch;
  }

  return result;
}
