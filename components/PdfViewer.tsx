"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  TextContent,
} from "pdfjs-dist/types/src/display/api";
import "@/lib/pdf-worker-setup";
import { SelectionPopover } from "@/components/SelectionPopover";

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

interface PageWordBox {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SelectionState {
  text: string;
  pageNumber: number;
  rect: DOMRect | null;
  isActive: boolean;
  wasTrimmed: boolean;
  boxes: PageWordBox[];
}

interface DragRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const EMPTY_SELECTION: SelectionState = {
  text: "",
  pageNumber: 0,
  rect: null,
  isActive: false,
  wasTrimmed: false,
  boxes: [],
};

export function PdfViewer({
  pdfUrl,
  onExplain,
  onLoadError,
  documentLabel,
  focusNote,
  initialPage,
}: PdfViewerProps) {
  const pageSurfaceRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [surfaceWidth, setSurfaceWidth] = useState(900);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [pageWords, setPageWords] = useState<PageWordBox[]>([]);
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const documentOptions = useMemo(
    () => ({
      standardFontDataUrl: "/standard_fonts/",
    }),
    [],
  );

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setDragRect(null);
    dragStartRef.current = null;
  }, []);

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
    setPdfDocument(null);
    setPageWords([]);
    setPageSize({ width: 0, height: 0 });
    clearSelection();
  }, [clearSelection, pdfUrl]);

  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
      clearSelection();
    }
  }, [clearSelection, initialPage]);

  const pageWidth = Math.floor(Math.max(Math.min(surfaceWidth, 1100), 320));

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    let cancelled = false;

    const loadPageWords = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = pageWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const textContent = await page.getTextContent({ disableNormalization: false });

        if (cancelled) {
          return;
        }

        setPageSize({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });
        setPageWords(extractWordBoxes(textContent, viewport));
      } catch {
        if (!cancelled) {
          setPageWords([]);
        }
      }
    };

    void loadPageWords();

    return () => {
      cancelled = true;
    };
  }, [currentPage, pageWidth, pdfDocument]);

  const buildSelection = useCallback(
    (rect: DragRect) => {
      const normalizedRect = normalizeRect(rect);
      const selectedBoxes = pageWords.filter((word) =>
        rectsIntersect(normalizedRect, word),
      );

      if (selectedBoxes.length === 0) {
        setSelection(EMPTY_SELECTION);
        return;
      }

      const sortedBoxes = [...selectedBoxes].sort((a, b) => {
        if (Math.abs(a.top - b.top) > Math.max(a.height, b.height) * 0.5) {
          return a.top - b.top;
        }
        return a.left - b.left;
      });

      const rawText = joinSelectedText(sortedBoxes);
      if (rawText.length < 3) {
        setSelection(EMPTY_SELECTION);
        return;
      }

      const wasTrimmed = rawText.length > 2000;
      const text = rawText.slice(0, 2000);
      const overlayRect = overlayRef.current?.getBoundingClientRect() ?? null;
      const bounds = getBounds(sortedBoxes);
      const selectionRect =
        overlayRect && bounds
          ? new DOMRect(
              overlayRect.left + bounds.left,
              overlayRect.top + bounds.top,
              bounds.width,
              bounds.height,
            )
          : null;

      setSelection({
        text,
        pageNumber: currentPage,
        rect: selectionRect,
        isActive: Boolean(selectionRect),
        wasTrimmed,
        boxes: sortedBoxes,
      });
    },
    [currentPage, pageWords],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    clearSelection();
    const point = getRelativePoint(event, overlay);
    dragStartRef.current = point;
    setDragRect({
      left: point.x,
      top: point.y,
      width: 0,
      height: 0,
    });
    overlay.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    const start = dragStartRef.current;
    if (!overlay || !start) {
      return;
    }

    const point = getRelativePoint(event, overlay);
    setDragRect({
      left: start.x,
      top: start.y,
      width: point.x - start.x,
      height: point.y - start.y,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    const start = dragStartRef.current;
    if (!overlay || !start) {
      return;
    }

    overlay.releasePointerCapture(event.pointerId);
    const point = getRelativePoint(event, overlay);
    const rect = {
      left: start.x,
      top: start.y,
      width: point.x - start.x,
      height: point.y - start.y,
    };

    const normalized = normalizeRect(rect);
    const isClickSelection = normalized.width < 6 && normalized.height < 6;
    if (isClickSelection) {
      const clickRect = {
        left: normalized.left - 3,
        top: normalized.top - 3,
        width: 6,
        height: 6,
      };
      buildSelection(clickRect);
    } else {
      buildSelection(normalized);
    }

    setDragRect(null);
    dragStartRef.current = null;
  };

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

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <Document
          file={pdfUrl}
          options={documentOptions}
          loading={
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
              Loading page...
            </div>
          }
          onLoadError={(error) => onLoadError?.(error as Error)}
          onLoadSuccess={(loadedPdf) => {
            setPdfDocument(loadedPdf);
            setNumPages(loadedPdf.numPages);
            setCurrentPage((page) => Math.min(page, loadedPdf.numPages));
          }}
        >
          <div className="mx-auto flex w-full max-w-[1180px] justify-center">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] ring-1 ring-gray-200">
              <div
                ref={pageSurfaceRef}
                className="relative flex justify-center"
                style={{
                  width: pageSize.width || pageWidth,
                  minHeight: pageSize.height || undefined,
                }}
              >
                <Page
                  className="mx-auto w-fit"
                  pageNumber={currentPage}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={pageWidth}
                />

                <div
                  ref={overlayRef}
                  className="absolute inset-0 z-10 cursor-text"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  {selection.boxes.map((box, index) => (
                    <div
                      key={`${index}-${box.left}-${box.top}`}
                      className="absolute rounded-sm bg-indigo-500/25 ring-1 ring-indigo-500/20"
                      style={{
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                      }}
                    />
                  ))}

                  {dragRect ? (
                    <div
                      className="absolute rounded-sm border border-sky-400/70 bg-sky-400/10"
                      style={normalizeRect(dragRect)}
                    />
                  ) : null}
                </div>
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

function getRelativePoint(
  event: React.PointerEvent<HTMLDivElement>,
  element: HTMLDivElement,
) {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function normalizeRect(rect: DragRect): DragRect {
  const left = rect.width >= 0 ? rect.left : rect.left + rect.width;
  const top = rect.height >= 0 ? rect.top : rect.top + rect.height;

  return {
    left,
    top,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

function rectsIntersect(
  a: DragRect,
  b: Pick<PageWordBox, "left" | "top" | "width" | "height">,
) {
  return !(
    a.left + a.width < b.left ||
    b.left + b.width < a.left ||
    a.top + a.height < b.top ||
    b.top + b.height < a.top
  );
}

function getBounds(boxes: PageWordBox[]) {
  if (boxes.length === 0) {
    return null;
  }

  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.left + box.width));
  const bottom = Math.max(...boxes.map((box) => box.top + box.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function joinSelectedText(boxes: PageWordBox[]) {
  let result = "";
  let previous: PageWordBox | null = null;

  for (const box of boxes) {
    if (!previous) {
      result += box.text;
      previous = box;
      continue;
    }

    const lineBreakThreshold = Math.max(previous.height, box.height) * 0.6;
    const newLine = Math.abs(box.top - previous.top) > lineBreakThreshold;

    if (newLine) {
      result += "\n";
    } else {
      result += " ";
    }

    result += box.text;
    previous = box;
  }

  return result
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function extractWordBoxes(
  textContent: TextContent,
  viewport: ReturnType<PDFPageProxy["getViewport"]>,
): PageWordBox[] {
  return textContent.items
    .flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) {
        return [];
      }

      const tx = pdfjs.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]);
      const left = tx[4];
      const top = tx[5] - fontHeight;
      const width = Math.max(item.width * viewport.scale, 1);
      const height = Math.max(fontHeight * 1.15, 8);

      return splitTextItemIntoWordBoxes(item.str, left, top, width, height);
    })
    .filter((box) => box.width > 0 && box.height > 0);
}

function splitTextItemIntoWordBoxes(
  text: string,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const words = Array.from(text.matchAll(/\S+/g));
  if (words.length === 0) {
    return [];
  }

  const totalChars = Math.max(text.length, 1);

  return words.map((match) => {
    const start = match.index ?? 0;
    const word = match[0];
    const wordLeft = left + (start / totalChars) * width;
    const wordWidth = Math.max((word.length / totalChars) * width, 4);

    return {
      text: word,
      left: wordLeft,
      top,
      width: wordWidth,
      height,
    };
  });
}
