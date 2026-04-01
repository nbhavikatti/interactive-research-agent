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
      className={`flex h-full flex-col rounded-[28px] border border-slate-200/80 bg-slate-950/70 shadow-[0_20px_60px_rgba(15,23,42,0.28)] backdrop-blur ${className}`}
    >
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
              Session
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {papers.length} / {MAX_SESSION_PAPERS} papers uploaded
            </p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {papers.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 text-center text-sm leading-6 text-slate-400">
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
                        ? "border-sky-400/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className={`min-w-0 flex-1 text-center ${
                          isSelectable ? "cursor-pointer" : "cursor-default"
                        }`}
                        disabled={!isSelectable}
                        onClick={() => onSelectPaper?.(paper.id)}
                        type="button"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-200 ring-1 ring-sky-400/30">
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-medium text-slate-100">
                            {paper.title || paper.filename}
                          </p>
                        </div>
                      </button>

                      {onRemovePaper ? (
                        <button
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
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
