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
    <div className="flex h-screen flex-col bg-[#f6f4ef]">
      <header className="border-b border-stone-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-900">{title}</p>
            {subtitle ? (
              <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,58%)_minmax(0,42%)]">
        <div className="min-h-0 overflow-auto bg-[#f4efe7]">{left}</div>
        <div className="min-h-0 overflow-y-auto border-t border-stone-200 bg-[#fcfbf8] lg:border-t-0 lg:border-l">
          {right}
        </div>
      </div>
    </div>
  );
}
