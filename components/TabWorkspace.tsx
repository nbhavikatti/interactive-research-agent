"use client";

import { useState } from "react";
import { DiagramRenderer } from "@/components/DiagramRenderer";
import { ExplanationCard } from "@/components/ExplanationCard";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "architecture", label: "Architecture" },
  { id: "key-files", label: "Key Files" },
  { id: "reading-order", label: "Reading Order" },
  { id: "how-it-works", label: "How It Works" },
  { id: "ask", label: "Ask Questions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface TabWorkspaceProps {
  paperId: string;
}

export function TabWorkspace({}: TabWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  const isFullWidth = activeTab === "architecture";

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header + tab bar */}
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="px-6 pt-4">
          <p className="text-sm font-medium text-gray-900">
            Interactive Research Agent
          </p>
        </div>
        <nav className="flex gap-0 px-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-indigo-600" />
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content — fills remaining screen */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={isFullWidth ? "h-full p-6" : "mx-auto h-full max-w-3xl p-6"}>
          <TabContent tabId={activeTab} />
        </div>
      </div>
    </div>
  );
}

/* ── Tab panels ── */

function TabContent({ tabId }: { tabId: TabId }) {
  switch (tabId) {
    case "summary":
      return <SummaryPanel />;
    case "architecture":
      return <ArchitecturePanel />;
    case "key-files":
      return <KeyFilesPanel />;
    case "reading-order":
      return <ReadingOrderPanel />;
    case "how-it-works":
      return <HowItWorksPanel />;
    case "ask":
      return <AskPanel />;
  }
}

function SummaryPanel() {
  return (
    <ExplanationCard
      explanation={{
        summary:
          "This is an interactive research agent built with Next.js. Users upload research papers, highlight passages, and receive AI-powered explanations with visual diagrams.",
        coreIdea:
          "The app streams LLM responses via Server-Sent Events to provide real-time explanations of highlighted text passages from uploaded PDF documents.",
        intuition:
          "Think of it like having a research assistant that reads over your shoulder. When you highlight confusing text, it instantly explains the concept in plain language and draws a diagram to help you visualize it.",
        breakdown:
          "1. User uploads a PDF via the landing page, which stores it in Vercel Blob storage.\n2. The workspace loads the PDF in a two-column layout with a viewer on the left.\n3. When the user highlights text, a popover offers to explain the selection.\n4. The explanation request streams through an SSE endpoint backed by GPT.\n5. The server parses the streamed JSON response and delivers structured sections: summary, core idea, intuition, and breakdown.\n6. A Mermaid diagram is rendered alongside the text explanation.",
      }}
    />
  );
}

function ArchitecturePanel() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          System Architecture
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          High-level overview of how the components connect.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <DiagramRenderer
          mermaidCode={`graph TD
    A[Landing Page] -->|Upload PDF| B[Upload API]
    B -->|Store| C[Vercel Blob]
    B -->|Parse text| D[pdf-parse]
    B -->|Redirect| E[Workspace Page]
    E --> F[PDF Viewer]
    E --> G[Insights Panel]
    F -->|Text selection| H[Selection Popover]
    H -->|Explain request| I[Explain API]
    I -->|Prompt| J[OpenAI GPT]
    J -->|SSE stream| I
    I -->|Streamed result| G
    G --> K[Explanation Card]
    G --> L[Diagram Renderer]`}
        />
      </div>
    </div>
  );
}

function KeyFilesPanel() {
  const files = [
    {
      path: "app/page.tsx",
      role: "Landing page with PDF upload zone and animated background.",
    },
    {
      path: "app/paper/[id]/page.tsx",
      role: "Workspace orchestrator — manages loading, analysis, and tab views.",
    },
    {
      path: "components/PdfViewer.tsx",
      role: "Renders uploaded PDFs with text selection support via react-pdf.",
    },
    {
      path: "components/InsightsPanel.tsx",
      role: "State machine for the insights panel: empty, loading, result, error.",
    },
    {
      path: "hooks/useStreamingExplain.ts",
      role: "Custom hook managing SSE streaming of LLM explanations.",
    },
    {
      path: "app/api/explain/route.ts",
      role: "API route that prompts the LLM and streams structured JSON back via SSE.",
    },
    {
      path: "lib/llm-client.ts",
      role: "OpenAI streaming client wrapper for chat completions.",
    },
    {
      path: "lib/prompt-builder.ts",
      role: "Constructs prompts with paper context and highlighted passage.",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        Key Files
      </h2>
      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
        {files.map((f) => (
          <li key={f.path} className="px-5 py-4">
            <p className="text-sm font-mono font-medium text-indigo-600">
              {f.path}
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">{f.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadingOrderPanel() {
  const order = [
    {
      step: 1,
      file: "app/page.tsx",
      reason: "Start with the entry point to understand the upload flow.",
    },
    {
      step: 2,
      file: "app/api/upload/route.ts",
      reason: "See how PDFs are validated, parsed, and stored.",
    },
    {
      step: 3,
      file: "app/paper/[id]/page.tsx",
      reason: "Understand the workspace page orchestration and state machine.",
    },
    {
      step: 4,
      file: "components/PdfViewer.tsx",
      reason: "Learn how PDFs are rendered and text selection works.",
    },
    {
      step: 5,
      file: "hooks/useStreamingExplain.ts",
      reason: "Follow the SSE streaming logic for LLM responses.",
    },
    {
      step: 6,
      file: "app/api/explain/route.ts",
      reason: "See server-side prompt building and response parsing.",
    },
    {
      step: 7,
      file: "components/ExplanationCard.tsx",
      reason: "See how structured explanations are displayed.",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        Suggested Reading Order
      </h2>
      <ol className="space-y-3">
        {order.map((item) => (
          <li
            key={item.step}
            className="flex gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
              {item.step}
            </span>
            <div>
              <p className="text-sm font-mono font-medium text-gray-900">
                {item.file}
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {item.reason}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HowItWorksPanel() {
  return (
    <ExplanationCard
      explanation={{
        summary:
          "The application follows a linear flow: upload, view, select, explain. Each step hands off to the next through React state and API calls.",
        coreIdea:
          "Server-Sent Events enable real-time streaming of LLM-generated explanations, so users see results as they are produced rather than waiting for the full response.",
        intuition:
          "Imagine a conveyor belt: the user places a highlighted passage at one end, the server feeds it through the LLM, and structured explanation sections roll out the other end in real time — summary first, then core idea, then intuition, then a full breakdown with a diagram.",
        breakdown:
          "1. The landing page accepts a PDF file and POSTs it to /api/upload.\n2. The upload route parses the PDF text, stores the file and metadata in Vercel Blob, and returns a paper ID.\n3. The client redirects to /paper/[id], which renders a two-column workspace.\n4. The PDF viewer (left panel) renders pages and tracks text selections via a custom hook.\n5. When the user clicks 'Explain', the client POSTs to /api/explain with the selected text and page number.\n6. The explain route builds a prompt with surrounding page context and streams the response via SSE.\n7. The client accumulates chunks and displays structured results in the insights panel.\n8. A Mermaid diagram is parsed and rendered alongside the text explanation.",
      }}
    />
  );
}

function AskPanel() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm text-center text-gray-400">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
          <svg
            className="h-6 w-6 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-gray-500">
          Ask a question about this repo
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Type a question below to get an AI-powered answer based on the
          repository analysis.
        </p>
      </div>
    </div>
  );
}
