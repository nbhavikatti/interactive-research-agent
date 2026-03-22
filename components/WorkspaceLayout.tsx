"use client";

import { ReactNode } from "react";

interface WorkspaceLayoutProps {
  left: ReactNode;
  right: ReactNode;
  title?: string;
}

export function WorkspaceLayout({
  left,
  right,
  title = "Interactive Research Agent",
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <p className="text-sm font-medium text-gray-900">{title}</p>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,55%)_minmax(0,45%)]">
        <div className="min-h-0 overflow-auto bg-gray-50">{left}</div>
        <div className="min-h-0 overflow-y-auto border-l border-gray-200 bg-white">
          {right}
        </div>
      </div>
    </div>
  );
}
