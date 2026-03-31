export const MAX_SESSION_PAPERS = 5;
export const MIN_ANALYSIS_PAPERS = 2;

export interface SessionPaper {
  id: string;
  filename: string;
  title: string;
  pageCount: number;
}

export interface CrossPaperSnapshot {
  paperId: string;
  title: string;
  focus: string;
  notableAngle: string;
}

export interface CrossPaperAnalysisResult {
  overview: string;
  sharedThemes: string[];
  keyDifferences: string[];
  crossPaperOpportunities: string[];
  paperSnapshots: CrossPaperSnapshot[];
}
