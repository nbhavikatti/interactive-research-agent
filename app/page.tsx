"use client";

import { useState } from "react";
import { CrossPaperInsightsPanel } from "@/components/CrossPaperInsightsPanel";
import { PdfViewer } from "@/components/PdfViewer";
import { UploadZone } from "@/components/UploadZone";
import { UploadedPapersPanel } from "@/components/UploadedPapersPanel";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";
import { useSessionAnalysis } from "@/hooks/useSessionAnalysis";
import {
  CrossPaperReference,
  MAX_SESSION_PAPERS,
  MIN_ANALYSIS_PAPERS,
  SessionPaper,
} from "@/lib/session-types";

type SessionMode = "upload" | "analysis";

interface UploadResponse {
  paperId: string;
  title: string;
  pageCount: number;
}

export default function Home() {
  const [mode, setMode] = useState<SessionMode>("upload");
  const [papers, setPapers] = useState<SessionPaper[]>([]);
  const [activePaperId, setActivePaperId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [activeReference, setActiveReference] = useState<CrossPaperReference | null>(
    null,
  );
  const { analyzeSession, error, isLoading, result } = useSessionAnalysis();

  const activePaper =
    papers.find((paper) => paper.id === activePaperId) ?? papers[0] ?? null;

  const canUploadMore = papers.length < MAX_SESSION_PAPERS;
  const canAnalyze = papers.length >= MIN_ANALYSIS_PAPERS && !isUploading;

  const handleFileSelected = async (file: File, firstPageImage: string | null) => {
    if (!canUploadMore) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (firstPageImage) {
      formData.append("firstPageImage", firstPageImage);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }

      const nextPaper: SessionPaper = {
        id: payload.paperId,
        filename: file.name,
        title: payload.title,
        pageCount: payload.pageCount,
      };

      setPapers((current) => [...current, nextPaper]);
      setActivePaperId((current) => current ?? nextPaper.id);
    } catch (errorValue) {
      setUploadError(
        errorValue instanceof Error
          ? errorValue.message
          : "Could not upload your paper.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePaper = (paperId: string) => {
    setPapers((current) => {
      const nextPapers = current.filter((paper) => paper.id !== paperId);
      if (activePaperId === paperId) {
        setActivePaperId(nextPapers[0]?.id ?? null);
      }
      return nextPapers;
    });
    setUploadError(null);
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      return;
    }

    setMode("analysis");
    setViewerError(null);
    setActiveReference(null);
    setActivePaperId((current) => current ?? papers[0]?.id ?? null);
    await analyzeSession(papers.map((paper) => paper.id));
  };

  if (mode === "analysis") {
    return (
      <WorkspaceLayout
        headerAction={
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900"
            onClick={() => setMode("upload")}
            type="button"
          >
            Back to uploads
          </button>
        }
        left={
          <div className="grid h-full min-h-0 xl:grid-cols-[272px_minmax(0,1fr)]">
            <div className="border-b border-slate-800 bg-[#081120] p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <UploadedPapersPanel
                activePaperId={activePaper?.id ?? null}
                className="h-full"
                heading="Session papers"
                papers={papers}
                onSelectPaper={(paperId) => {
                  setActivePaperId(paperId);
                  setActiveReference(null);
                  setViewerError(null);
                }}
              />
            </div>
            <div className="min-h-0">
              {activePaper ? (
                <PdfViewer
                  documentLabel={activePaper.title || activePaper.filename}
                  focusNote={
                    activeReference &&
                    (activeReference.paperId === activePaper.id ||
                      activeReference.filename === activePaper.filename)
                      ? buildReferenceNote(activeReference)
                      : null
                  }
                  initialPage={
                    activeReference &&
                    (activeReference.paperId === activePaper.id ||
                      activeReference.filename === activePaper.filename)
                      ? activeReference.pageNumber
                      : null
                  }
                  onLoadError={(loadError) => {
                    setViewerError(
                      `This PDF could not be loaded. ${loadError.message || "Check the server logs for details."}`,
                    );
                  }}
                  pdfUrl={`/api/pdf/${activePaper.id}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
                  Select a paper to preview it.
                </div>
              )}
            </div>
          </div>
        }
        right={
          viewerError ? (
            <div className="p-6">
              <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
                {viewerError}
              </div>
            </div>
          ) : (
            <CrossPaperInsightsPanel
              error={error}
              onReferenceSelect={(reference) => {
                setActiveReference(reference);
                const matchingPaper = papers.find(
                  (paper) =>
                    (reference.paperId && paper.id === reference.paperId) ||
                    paper.filename === reference.filename,
                );
                if (matchingPaper) {
                  setActivePaperId(matchingPaper.id);
                  setViewerError(null);
                }
              }}
              onRetry={() => void analyzeSession(papers.map((paper) => paper.id))}
              papers={papers}
              result={result}
              state={isLoading ? "loading" : error ? "error" : result ? "result" : "idle"}
            />
          )
        }
        subtitle="Multi-paper session workspace"
        title="Interactive Research Agent"
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b14] px-6 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(180deg,_#08101d,_#050b14)]" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[640px] items-center justify-center">
          <div className="w-full max-w-3xl rounded-[40px] border border-slate-800/90 bg-slate-950/68 p-8 shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">
                Research sessions
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50 sm:text-6xl">
                Interactive Research Agent
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Upload up to 5 research papers and we will provide cross-paper
                insights, comparisons, themes, and idea generation across the
                session.
              </p>
            </div>

            <div className="mt-10">
              {isUploading ? (
                <div className="mx-auto w-full max-w-xl rounded-[28px] border border-slate-800 bg-slate-900/80 p-8 shadow-sm">
                  <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="animate-shimmer h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-200">
                    Uploading and parsing your paper...
                  </p>
                </div>
              ) : (
                <UploadZone
                  disabled={!canUploadMore}
                  helperText="Upload up to 5 research papers and we will provide cross-paper insights and analysis."
                  onFileSelected={(file, firstPageImage) =>
                    void handleFileSelected(file, firstPageImage)
                  }
                  supportingText={`${papers.length} / ${MAX_SESSION_PAPERS} papers uploaded`}
                />
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-slate-400">
                Upload at least {MIN_ANALYSIS_PAPERS} papers to unlock cross-paper
                analysis.
              </p>
              <button
                className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                disabled={!canAnalyze}
                onClick={() => void handleAnalyze()}
                type="button"
              >
                Analyze Papers
              </button>
            </div>

            {uploadError ? (
              <div className="mx-auto mt-6 max-w-xl rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-left text-sm text-red-200">
                <p>{uploadError}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="min-h-[640px] lg:py-10">
          <UploadedPapersPanel
            className="h-full"
            papers={papers}
            onRemovePaper={handleRemovePaper}
          />
        </section>
      </div>
    </main>
  );
}

function buildReferenceNote(reference: CrossPaperReference): string {
  const location = [
    reference.pageNumber ? `Page ${reference.pageNumber}` : null,
    reference.section || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `${location ? `${location} · ` : ""}${reference.snippet}`;
}
