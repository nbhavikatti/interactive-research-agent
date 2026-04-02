import pdfParse from "pdf-parse";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { extractPaperTitle } from "@/lib/llm-client";

export interface ParsedPage {
  pageNum: number;
  text: string;
}

export interface ParsedPaper {
  title: string;
  pages: ParsedPage[];
}

interface FirstPageSignals {
  fullText: string;
  topBlocks: string[];
}

interface CandidateLine {
  fontSize: number;
  text: string;
  x: number;
  y: number;
}

export async function parsePdf(
  buffer: Buffer,
  filename = "paper.pdf",
  firstPageImage: string | null = null,
): Promise<ParsedPaper> {
  const data = await pdfParse(buffer);
  const fullText = data.text ?? "";

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

  const firstPageSignals = await extractFirstPageSignals(buffer, pages[0]?.text ?? "");
  const fallbackTitle = fallbackTitleFromSignals(firstPageSignals);

  const llmTitle = process.env.OPENAI_API_KEY && firstPageImage
    ? await extractPaperTitle({
        fallbackTitle,
        firstPageImage,
      }).catch(() => null)
    : null;

  return {
    title: normalizeTitle(llmTitle || fallbackTitle || "Untitled Paper"),
    pages,
  };
}

async function extractFirstPageSignals(
  buffer: Buffer,
  fallbackText: string,
): Promise<FirstPageSignals> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    const pdf = await loadingTask.promise;

    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent({ disableNormalization: false });
      const items = textContent.items.filter(isTextItem);
      const topBlocks = buildTopBlocks(items, viewport.height);
      const fullText = normalizeWhitespace(items.map((item) => item.str).join(" "));

      return {
        fullText: fullText || fallbackText,
        topBlocks,
      };
    } finally {
      await pdf.destroy();
    }
  } catch {
    return {
      fullText: fallbackText,
      topBlocks: fallbackText
        .split("\n")
        .map((line) => normalizeWhitespace(line))
        .filter(Boolean)
        .slice(0, 8),
    };
  }
}

function buildTopBlocks(items: TextItem[], pageHeight: number): string[] {
  const candidates = items
    .map((item) => {
      const text = normalizeWhitespace(item.str);
      const fontSize = item.height || Math.hypot(item.transform[0], item.transform[1]);
      const x = Number(item.transform[4] ?? 0);
      const y = Number(item.transform[5] ?? 0);

      return {
        fontSize,
        text,
        x,
        y,
      };
    })
    .filter((item) => {
      if (!item.text) {
        return false;
      }

      if (pageHeight > 0 && item.y < pageHeight * 0.45) {
        return false;
      }

      if (item.fontSize < 8) {
        return false;
      }

      return /[A-Za-z]/.test(item.text);
    })
    .sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3) {
        return b.y - a.y;
      }

      return a.x - b.x;
    });

  const lines: Array<{ y: number; parts: CandidateLine[] }> = [];

  for (const item of candidates) {
    const line = lines.find(
      (entry) => Math.abs(entry.y - item.y) <= Math.max(3, item.fontSize * 0.35),
    );

    if (line) {
      line.parts.push(item);
      line.y = (line.y + item.y) / 2;
      continue;
    }

    lines.push({ y: item.y, parts: [item] });
  }

  return lines
    .map((line) => {
      const sorted = [...line.parts].sort((a, b) => a.x - b.x);
      const text = normalizeWhitespace(sorted.map((part) => part.text).join(" "));
      const avgFontSize =
        sorted.reduce((sum, part) => sum + part.fontSize, 0) / sorted.length;

      return {
        avgFontSize,
        text,
        y: line.y,
      };
    })
    .filter((line) => line.text.length >= 6)
    .sort((a, b) => {
      if (Math.abs(b.avgFontSize - a.avgFontSize) > 0.5) {
        return b.avgFontSize - a.avgFontSize;
      }

      return b.y - a.y;
    })
    .slice(0, 8)
    .map((line) => line.text);
}

function fallbackTitleFromSignals(signals: FirstPageSignals): string {
  const topCandidate = signals.topBlocks.find(isProbableTitle);
  if (topCandidate) {
    return topCandidate;
  }

  const lineCandidate = signals.fullText
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .find(isProbableTitle);

  return lineCandidate || "Untitled Paper";
}

function isProbableTitle(text: string): boolean {
  if (text.length < 12 || text.length > 220) {
    return false;
  }

  const lower = text.toLowerCase();
  if (
    lower.startsWith("abstract") ||
    lower.startsWith("introduction") ||
    lower.startsWith("arxiv") ||
    lower.startsWith("figure ") ||
    lower.startsWith("table ") ||
    lower.includes("@") ||
    lower.includes("university") ||
    lower.includes("institute")
  ) {
    return false;
  }

  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const digits = (text.match(/\d/g) ?? []).length;

  return letters >= 8 && digits <= Math.max(4, letters / 3);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeTitle(text: string): string {
  return normalizeWhitespace(text)
    .replace(/\s+([:;,.!?])/g, "$1")
    .slice(0, 220);
}

function isTextItem(item: TextItem | { type: string }): item is TextItem {
  return "str" in item;
}
