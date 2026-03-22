"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SelectionPopoverProps {
  rect: DOMRect;
  onExplain: () => void;
  onDismiss: () => void;
}

export function SelectionPopover({
  rect,
  onExplain,
  onDismiss,
}: SelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onDismiss();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onDismiss]);

  const style = {
    left: rect.left + rect.width / 2,
    top: rect.bottom + 8,
    transform: "translateX(-50%)",
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 animate-[fadeIn_100ms_ease-out] rounded-full bg-white shadow-md"
      style={style}
    >
      <button
        className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        onClick={onExplain}
        type="button"
      >
        Explain
      </button>
    </div>,
    document.body,
  );
}
