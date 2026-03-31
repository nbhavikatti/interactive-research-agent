"use client";

import { ReactNode } from "react";
import { MAX_SESSION_PAPERS, SessionPaper } from "@/lib/session-types";

interface UploadedPapersPanelProps {
  papers: SessionPaper[];
  activePaperId?: string | null;
  onSelectPaper?: (paperId: string) => void;
  onRemovePaper?: (paperId: string) => void;
  action?: ReactNode;
  className?: string;
  heading?: string;
}

export function UploadedPapersPanel({
  papers,
  activePaperId,
  onSelectPaper,
  onRemovePaper,
  action,
  className = "",
  heading = "Uploaded papers",
}: UploadedPapersPanelProps) {
  return (
    <aside
      className={`flex h-full flex-col rounded-[28px] border border-gray-200/80 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}
    >
      <div className="border-b border-gray-100 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Session
            </p>
            <h2 className="mt-2 text-lg font-semibold text-stone-900">{heading}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {papers.length} / {MAX_SESSION_PAPERS} papers uploaded
            </p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {papers.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-5 text-center text-sm leading-6 text-stone-500">
            No papers uploaded yet
          </div>
        ) : (
          <ul className="space-y-2">
            {papers.map((paper, index) => {
              const isActive = paper.id === activePaperId;
              const isSelectable = Boolean(onSelectPaper);

              return (
                <li key={paper.id}>
                  <div
                    className={`rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? "border-indigo-200 bg-indigo-50/80 shadow-sm"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className={`min-w-0 flex-1 text-left ${
                          isSelectable ? "cursor-pointer" : "cursor-default"
                        }`}
                        disabled={!isSelectable}
                        onClick={() => onSelectPaper?.(paper.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-medium text-stone-900">
                            {paper.filename}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {paper.title}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-stone-400">
                          {paper.pageCount} pages
                        </p>
                      </button>

                      {onRemovePaper ? (
                        <button
                          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onRemovePaper(paper.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
