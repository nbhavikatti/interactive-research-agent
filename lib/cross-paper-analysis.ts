import {
  CrossPaperAnalysisDebug,
  CrossPaperAnalysisResult,
  CrossPaperInsight,
  CrossPaperReference,
  CrossPaperSnapshot,
} from "@/lib/session-types";

interface NormalizeCrossPaperAnalysisInput {
  raw: unknown;
  rawOutput?: string;
}

interface NormalizeCrossPaperAnalysisOutput {
  debug: CrossPaperAnalysisDebug;
  result: CrossPaperAnalysisResult | null;
}

export function normalizeCrossPaperAnalysis({
  raw,
  rawOutput = "",
}: NormalizeCrossPaperAnalysisInput): NormalizeCrossPaperAnalysisOutput {
  const source = isRecord(raw) ? raw : {};
  const warnings: string[] = [];
  let usedFallbackNormalization = false;

  const overview = toText(source.overview);
  if (!overview) {
    warnings.push("Missing overview in cross-paper analysis output.");
  }

  const insights = normalizeInsights(source.insights, warnings);
  if (insights.length === 0) {
    warnings.push("No valid cross-paper insights were returned.");
  }

  const paperSnapshots = normalizeSnapshots(source.paperSnapshots);
  if (paperSnapshots.length === 0) {
    usedFallbackNormalization = true;
  }

  if (!overview && insights.length === 0) {
    return {
      debug: {
        parseWarning: warnings.join(" "),
        rawOutputPreview: rawOutput.slice(0, 2000),
        usedFallbackNormalization,
      },
      result: null,
    };
  }

  return {
    debug: {
      parseWarning: warnings.length > 0 ? warnings.join(" ") : null,
      rawOutputPreview: rawOutput.slice(0, 2000),
      usedFallbackNormalization,
    },
    result: {
      overview:
        overview || "Cross-paper analysis was partially recovered from the model output.",
      insights,
      paperSnapshots,
      warnings,
    },
  };
}

function normalizeInsights(
  value: unknown,
  warnings: string[],
): CrossPaperInsight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeInsight(item, index, warnings))
    .filter((item): item is CrossPaperInsight => Boolean(item));
}

function normalizeInsight(
  value: unknown,
  index: number,
  warnings: string[],
): CrossPaperInsight | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toText(value.title) || `Insight ${index + 1}`;
  const insight = toText(value.insight);
  const whyItMatters = toText(value.whyItMatters);
  const references = normalizeReferences(value.references);

  if (!insight || !whyItMatters) {
    warnings.push(`Insight ${index + 1} was missing required text fields.`);
    if (!insight && !whyItMatters) {
      return null;
    }
  }

  if (references.length === 0) {
    warnings.push(`Insight ${index + 1} did not include any valid references.`);
  }

  return {
    id: `insight-${index + 1}`,
    title,
    insight: insight || "The model returned this insight without a clean body.",
    whyItMatters:
      whyItMatters || "This matters, but the model did not provide a usable explanation.",
    references,
  };
}

function normalizeReferences(value: unknown): CrossPaperReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const paperId = toText(item.paperId);
      const filename = toText(item.filename);
      const paperTitle = toText(item.paperTitle) || toText(item.title);
      const pageNumber = toNumber(item.pageNumber);
      const section = toText(item.section);
      const snippet = toText(item.snippet);

      if (!paperId && !filename && !paperTitle) {
        return null;
      }

      return {
        filename: filename || "Unknown file",
        paperId: paperId || "",
        paperTitle: paperTitle || filename || "Unknown paper",
        pageNumber,
        section: section || null,
        snippet: snippet || "No supporting snippet returned.",
      };
    })
    .filter((item): item is CrossPaperReference => Boolean(item));
}

function normalizeSnapshots(value: unknown): CrossPaperSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const paperId = toText(item.paperId);
      const title = toText(item.title);
      const focus = toText(item.focus);
      const notableAngle = toText(item.notableAngle);

      if (!paperId || !title) {
        return null;
      }

      return {
        focus: focus || "No focus summary returned.",
        notableAngle: notableAngle || "No unique angle returned.",
        paperId,
        title,
      };
    })
    .filter((item): item is CrossPaperSnapshot => Boolean(item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
