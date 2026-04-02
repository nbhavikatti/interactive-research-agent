"use client";

import { ReactNode } from "react";

interface WorkspaceLayoutProps {
  left: ReactNode;
  right: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
}

export function WorkspaceLayout({
  left,
  right,
  title = "Interactive Research Agent",
  subtitle,
  headerAction,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-[#06111f]">
      <header className="border-b border-slate-800 bg-slate-950/88 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-100">{title}</p>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,64%)_minmax(320px,36%)] xl:grid-cols-[minmax(0,70%)_minmax(340px,30%)]">
        <div className="min-h-0 overflow-auto bg-[#0b1728]">{left}</div>
        <div className="min-h-0 overflow-y-auto border-t border-slate-800 bg-[#07101d] lg:border-t-0 lg:border-l">
          {right}
        </div>
      </div>
    </div>
  );
}
