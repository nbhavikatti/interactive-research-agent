export const MAX_SESSION_PAPERS = 5;
export const MIN_ANALYSIS_PAPERS = 1;

export interface SessionPaper {
  id: string;
  filename: string;
  title: string;
  pageCount: number;
}

export interface CrossPaperReference {
  paperId: string;
  filename: string;
  paperTitle: string;
  pageNumber: number | null;
  section: string | null;
  snippet: string;
}

export interface CrossPaperInsight {
  id: string;
  title: string;
  insight: string;
  whyItMatters: string;
  references: CrossPaperReference[];
}

export interface CrossPaperSnapshot {
  paperId: string;
  title: string;
  focus: string;
  notableAngle: string;
}

export interface CrossPaperAnalysisDebug {
  rawOutputPreview: string;
  parseWarning: string | null;
  usedFallbackNormalization: boolean;
}

export interface CrossPaperAnalysisResult {
  overview: string;
  insights: CrossPaperInsight[];
  paperSnapshots: CrossPaperSnapshot[];
  warnings: string[];
  debug?: CrossPaperAnalysisDebug;
}
