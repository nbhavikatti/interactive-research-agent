"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { InsightsPanel } from "@/components/InsightsPanel";
import { PdfViewer } from "@/components/PdfViewer";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";
import { useStreamingExplain } from "@/hooks/useStreamingExplain";

interface PendingSelection {
  text: string;
  pageNumber: number;
}

export default function PaperWorkspacePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paperId = params.id;
  const initialPdfUrl = searchParams.get("pdf");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);
  const {
    isLoading,
    result,
    error,
    statusMessage,
    requestExplanation,
  } = useStreamingExplain();

  const hasInsight = Boolean(result?.explanation || result?.diagram);
  const panelState = viewerError
    ? "error"
    : error && !hasInsight
      ? "error"
      : hasInsight
        ? "result"
        : isLoading
          ? "loading"
          : "empty";

  if (viewerError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Paper not found. Upload a new one.
          </h1>
          <p className="mt-3 text-sm text-gray-500">{viewerError}</p>
          <Link
            className="mt-6 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            href="/"
          >
            Back to upload
          </Link>
        </div>
      </main>
    );
  }

  const runExplanation = async (selection: PendingSelection) => {
    setPendingSelection(selection);
    await requestExplanation(paperId, selection.text, selection.pageNumber);
  };

  return (
    <WorkspaceLayout
      left={
        <PdfViewer
          pdfUrl={initialPdfUrl || `/api/pdf/${paperId}`}
          onExplain={runExplanation}
          onLoadError={(loadError) => {
            console.error(loadError);
            setViewerError(
              `This PDF could not be loaded. ${loadError.message || "Check the server logs for details."}`,
            );
          }}
        />
      }
      right={
        <InsightsPanel
          error={error}
          insight={result}
          onRetry={() => {
            if (pendingSelection) {
              void runExplanation(pendingSelection);
            }
          }}
          selectedText={pendingSelection?.text}
          state={panelState}
          statusMessage={statusMessage}
        />
      }
    />
  );
}
