"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "@/lib/pdf-worker-setup";
import { SelectionPopover } from "@/components/SelectionPopover";
import { useTextSelection } from "@/hooks/useTextSelection";

interface ExplainSelection {
  text: string;
  pageNumber: number;
}

interface PdfViewerProps {
  pdfUrl: string;
  onExplain?: (selection: ExplainSelection) => void;
  onLoadError?: (error: Error) => void;
  documentLabel?: string;
  focusNote?: string | null;
  initialPage?: number | null;
}

export function PdfViewer({
  pdfUrl,
  onExplain,
  onLoadError,
  documentLabel,
  focusNote,
  initialPage,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageSurfaceRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [surfaceWidth, setSurfaceWidth] = useState(900);
  const { selection, clearSelection } = useTextSelection(containerRef);

  useEffect(() => {
    const surface = pageSurfaceRef.current;
    if (!surface) {
      return;
    }

    const updateWidth = () => {
      setSurfaceWidth(surface.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(surface);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setNumPages(0);
    setCurrentPage(1);
    clearSelection();
  }, [clearSelection, pdfUrl]);

  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
      clearSelection();
    }
  }, [clearSelection, initialPage]);

  const pageWidth = Math.floor(Math.max(Math.min(surfaceWidth, 1100), 320));

  return (
    <div className="flex h-full flex-col bg-[#eef1f5]">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-700">
            Page {currentPage}
            {numPages > 0 ? ` of ${numPages}` : ""}
          </p>
          {documentLabel ? (
            <p className="max-w-xs truncate text-sm text-gray-500">
              {documentLabel}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage <= 1}
              onClick={() => {
                clearSelection();
                setCurrentPage((page) => Math.max(page - 1, 1));
              }}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={numPages === 0 || currentPage >= numPages}
              onClick={() => {
                clearSelection();
                setCurrentPage((page) => Math.min(page + 1, numPages));
              }}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
        {focusNote ? (
          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {focusNote}
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <Document
          file={pdfUrl}
          loading={
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
              Loading page...
            </div>
          }
          onLoadError={(error) => onLoadError?.(error as Error)}
          onLoadSuccess={({ numPages: loadedPages }) => {
            setNumPages(loadedPages);
            setCurrentPage((page) => Math.min(page, loadedPages));
          }}
        >
          <div className="mx-auto flex w-full max-w-[1180px] justify-center">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] ring-1 ring-gray-200">
              <div ref={pageSurfaceRef} className="flex justify-center">
                <Page
                  className="mx-auto w-fit"
                  pageNumber={currentPage}
                  renderAnnotationLayer={false}
                  renderTextLayer
                  width={pageWidth}
                />
              </div>
            </div>
          </div>
        </Document>

        {selection.isActive && selection.rect ? (
          <SelectionPopover
            rect={selection.rect}
            onDismiss={clearSelection}
            onExplain={() => {
              onExplain?.({
                text: selection.text,
                pageNumber: selection.pageNumber || currentPage,
              });
              clearSelection();
            }}
          />
        ) : null}

        {selection.wasTrimmed ? (
          <div className="fixed bottom-4 right-4 rounded-full bg-amber-50 px-4 py-2 text-xs text-amber-700 shadow-sm ring-1 ring-amber-200">
            Selection trimmed to 2000 characters
          </div>
        ) : null}
      </div>
    </div>
  );
}
