"use client";

import { RefObject, useEffect, useState } from "react";

export interface TextSelectionState {
  text: string;
  pageNumber: number;
  rect: DOMRect | null;
  isActive: boolean;
  wasTrimmed?: boolean;
}

const EMPTY_SELECTION: TextSelectionState = {
  text: "",
  pageNumber: 0,
  rect: null,
  isActive: false,
  wasTrimmed: false,
};

export function useTextSelection(containerRef: RefObject<HTMLDivElement>) {
  const [selection, setSelection] = useState<TextSelectionState>(EMPTY_SELECTION);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleMouseUp = () => {
      const browserSelection = window.getSelection();

      if (!browserSelection || browserSelection.rangeCount === 0) {
        setSelection(EMPTY_SELECTION);
        return;
      }

      const rawText = browserSelection.toString().replace(/\s+/g, " ").trim();
      if (rawText.length < 10) {
        setSelection(EMPTY_SELECTION);
        return;
      }

      const anchorNode = browserSelection.anchorNode;
      if (!anchorNode) {
        setSelection(EMPTY_SELECTION);
        return;
      }

      const anchorElement =
        anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;

      if (!anchorElement || !container.contains(anchorElement)) {
        setSelection(EMPTY_SELECTION);
        return;
      }

      const pageElement = anchorElement.closest("[data-page-number]");
      const pageNumber = Number(
        pageElement?.getAttribute("data-page-number") ?? "0",
      );
      const rect = browserSelection.getRangeAt(0).getBoundingClientRect();
      const wasTrimmed = rawText.length > 2000;
      const text = rawText.slice(0, 2000);

      setSelection({
        text,
        pageNumber,
        rect,
        isActive: rect.width > 0 || rect.height > 0,
        wasTrimmed,
      });
    };

    container.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [containerRef]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(EMPTY_SELECTION);
  };

  return { selection, clearSelection };
}
