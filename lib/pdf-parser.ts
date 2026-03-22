import pdfParse from "pdf-parse";

export interface ParsedPage {
  pageNum: number;
  text: string;
}

export interface ParsedPaper {
  title: string;
  pages: ParsedPage[];
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPaper> {
  const data = await pdfParse(buffer);
  const fullText = data.text ?? "";
  const title = extractTitle(fullText);

  const rawPages = fullText
    .split(/\f/)
    .map((page) => page.trim())
    .filter(Boolean);

  const pages =
    rawPages.length > 0
      ? rawPages.map((text, index) => ({
          pageNum: index + 1,
          text,
        }))
      : [{ pageNum: 1, text: fullText.trim() || "No text extracted." }];

  return { title, pages };
}

function extractTitle(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0]?.slice(0, 200) || "Untitled Paper";
}
