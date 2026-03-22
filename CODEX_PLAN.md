# Interactive Research Agent — Codex Execution Plan

> Upload a research paper PDF → highlight any passage → get an LLM explanation + visual diagram.
> Next.js 14 (App Router) + Tailwind + react-pdf + Claude API + Mermaid.js. No auth, no database.

---

## Phase 1: Project Scaffold

### Task 1.1 — Initialize Next.js project

**Command:**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

**Then install dependencies:**

```bash
npm install react-pdf pdfjs-dist pdf-parse @anthropic-ai/sdk mermaid
npm install -D @types/pdf-parse
```

**Acceptance criteria:**

- `npm run dev` starts without errors
- Tailwind works (add a colored div to `app/page.tsx` and confirm)
- All dependencies in `package.json`

---

### Task 1.2 — Configure pdf.js worker

**File:** `next.config.js`

Update the Next.js config to handle pdf.js worker:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
```

**File:** `lib/pdf-worker-setup.ts`

```ts
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

**Acceptance criteria:**

- No canvas/worker errors when importing react-pdf

---

### Task 1.3 — Create folder structure

Create these empty directories and placeholder files:

```
app/
  page.tsx                         (landing page — exists from scaffold)
  layout.tsx                       (root layout — exists from scaffold)
  paper/
    [id]/
      page.tsx                     (workspace page — empty for now)
  api/
    upload/
      route.ts                     (upload endpoint — empty for now)
    pdf/
      [id]/
        route.ts                   (serve PDF — empty for now)
    explain/
      route.ts                     (LLM endpoint — empty for now)
components/
  UploadZone.tsx
  WorkspaceLayout.tsx
  PdfViewer.tsx
  SelectionPopover.tsx
  InsightsPanel.tsx
  ExplanationCard.tsx
  DiagramRenderer.tsx
  SkeletonLoader.tsx
hooks/
  useTextSelection.ts
  useStreamingExplain.ts
lib/
  pdf-parser.ts
  paper-store.ts
  prompt-builder.ts
  llm-client.ts
  pdf-worker-setup.ts
```

Each file should export a placeholder (empty component or empty function) so imports don't break.

**Acceptance criteria:**

- All files exist
- `npm run build` passes with no errors

---

### Task 1.4 — Global styles and layout

**File:** `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive Research Agent",
  description: "Make research papers interactive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

**File:** `app/globals.css`

Keep Tailwind directives. Add:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
}

::selection {
  background-color: rgba(99, 102, 241, 0.3);
}
```

**File:** `tailwind.config.ts`

Extend with indigo as primary accent. No other customization needed.

**Acceptance criteria:**

- App renders with white background, Inter font, indigo selection color
- No default Next.js boilerplate visible

---

## Phase 2: Landing Page + Upload

### Task 2.1 — UploadZone component

**File:** `components/UploadZone.tsx`

Build a client component (`"use client"`) that:

1. Renders a large dashed-border drop zone (centered on page, ~500px wide)
2. Accepts drag-and-drop events (`onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`)
3. Also has a hidden `<input type="file" accept=".pdf">` triggered by clicking the drop zone
4. On file selection:
   - Validates file is `.pdf`
   - Validates file size < 50MB
   - Shows error message if validation fails
5. When a valid file is selected, calls `onFileSelected(file: File)` prop
6. Visual states:
   - Default: dashed border, icon, "Drag and drop a PDF or click to upload"
   - Drag hover: border turns indigo, background tints
   - Error: red text below the drop zone

**Props:** `onFileSelected: (file: File) => void`

**Acceptance criteria:**

- Renders centered drop zone
- Drag-and-drop works
- Click-to-browse works
- Rejects non-PDF files with error message
- Rejects files > 50MB with error message

---

### Task 2.2 — Landing page with upload flow

**File:** `app/page.tsx`

Build a client component that:

1. Renders centered layout:
   - App name: "Interactive Research Agent" (text-3xl, font-semibold)
   - Subtitle: "Upload a research paper. Highlight any passage. Get instant explanations and visuals." (text-gray-500)
   - `<UploadZone />` component below
2. When `onFileSelected` fires:
   - Shows upload progress state (replace drop zone with progress bar)
   - Text: "Uploading and parsing your paper..."
   - Sends POST to `/api/upload` with the file as `FormData`
   - On success: redirect to `/paper/{paperId}` using `router.push()`
   - On error: show error message with "Try again" button that resets to drop zone

**Acceptance criteria:**

- Landing page looks clean and centered
- Upload triggers POST request (will 404 until API is built — that's fine)
- Progress state renders
- Error state renders and allows retry

---

### Task 2.3 — Upload API endpoint

**File:** `app/api/upload/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { parsePdf } from "@/lib/pdf-parser";
import { paperStore } from "@/lib/paper-store";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  // 1. Extract file from FormData
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  // 2. Save to /tmp/uploads/{uuid}.pdf
  const id = randomUUID();
  const uploadDir = path.join("/tmp", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, `${id}.pdf`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // 3. Parse text
  const parsed = await parsePdf(buffer);

  // 4. Store in memory
  paperStore.set(id, {
    id,
    filename: file.name,
    filePath,
    title: parsed.title,
    pages: parsed.pages,
  });

  // 5. Return metadata
  return NextResponse.json({
    paperId: id,
    title: parsed.title,
    pageCount: parsed.pages.length,
  });
}
```

**Acceptance criteria:**

- Accepts PDF upload via FormData
- Saves file to disk
- Returns JSON with paperId, title, pageCount
- Returns 400 for non-PDF files

---

### Task 2.4 — PDF parser module

**File:** `lib/pdf-parser.ts`

```ts
import pdfParse from "pdf-parse";

interface ParsedPage {
  pageNum: number;
  text: string;
}

interface ParsedPaper {
  title: string;
  pages: ParsedPage[];
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPaper> {
  const data = await pdfParse(buffer);

  // pdf-parse gives us full text; split by page using the render callback
  // For simplicity, split on form feed characters or re-parse per page
  const fullText = data.text;
  const title = extractTitle(fullText);

  // Use numpages and re-parse with page render to get per-page text
  const pages: ParsedPage[] = [];
  const pageTexts = fullText.split(/\f/); // Form feed splits pages in pdf-parse output

  for (let i = 0; i < pageTexts.length; i++) {
    const text = pageTexts[i].trim();
    if (text.length > 0) {
      pages.push({ pageNum: i + 1, text });
    }
  }

  // If form feed splitting didn't work, treat entire text as page 1
  if (pages.length === 0) {
    pages.push({ pageNum: 1, text: fullText });
  }

  return { title, pages };
}

function extractTitle(text: string): string {
  // Heuristic: first non-empty line is likely the title
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return lines[0]?.trim().slice(0, 200) || "Untitled Paper";
}
```

**Acceptance criteria:**

- `parsePdf(buffer)` returns title and pages array
- Works on a real research paper PDF (test with any arXiv paper)
- Handles PDFs where form-feed splitting doesn't work

---

### Task 2.5 — Paper store module

**File:** `lib/paper-store.ts`

```ts
interface StoredPaper {
  id: string;
  filename: string;
  filePath: string;
  title: string;
  pages: { pageNum: number; text: string }[];
}

class PaperStore {
  private papers = new Map<string, StoredPaper>();

  set(id: string, paper: StoredPaper) {
    this.papers.set(id, paper);
  }

  get(id: string): StoredPaper | undefined {
    return this.papers.get(id);
  }

  has(id: string): boolean {
    return this.papers.has(id);
  }
}

export const paperStore = new PaperStore();
```

**Acceptance criteria:**

- Singleton in-memory store
- get/set/has work correctly

---

### Task 2.6 — PDF serving endpoint

**File:** `app/api/pdf/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { paperStore } from "@/lib/paper-store";
import { readFile } from "fs/promises";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const paper = paperStore.get(params.id);
  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  const fileBuffer = await readFile(paper.filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${paper.filename}"`,
    },
  });
}
```

**Acceptance criteria:**

- GET `/api/pdf/{id}` returns the raw PDF
- Returns 404 for unknown IDs

---

**✅ Phase 2 checkpoint:** User can upload a PDF from the landing page, it gets parsed, and the app redirects to `/paper/{id}`. The PDF can be fetched by ID.

---

## Phase 3: PDF Viewer Workspace

### Task 3.1 — WorkspaceLayout component

**File:** `components/WorkspaceLayout.tsx`

Build a client component that:

1. Renders a full-height split-panel layout using CSS grid or flexbox
2. Left panel: 55% width, overflow-y scroll — will hold `PdfViewer`
3. Right panel: 45% width, overflow-y scroll — will hold `InsightsPanel`
4. Thin 1px gray border between panels
5. Top bar: simple header with app name (text-sm, font-medium) — left aligned
6. Accepts `left` and `right` as children/render props

**Props:**

```ts
{
  left: React.ReactNode;
  right: React.ReactNode;
  title?: string;
}
```

**Acceptance criteria:**

- Split-panel layout renders
- Both panels scroll independently
- Responsive enough to not break at 1200px+ widths (don't worry about mobile)

---

### Task 3.2 — PdfViewer component

**File:** `components/PdfViewer.tsx`

Build a client component (`"use client"`) that:

1. Imports and initializes pdf.js worker (from `lib/pdf-worker-setup.ts`)
2. Uses `Document` and `Page` from `react-pdf`
3. Loads PDF from a URL prop (e.g., `/api/pdf/{id}`)
4. Renders ALL pages vertically stacked (continuous scroll, not paginated)
5. Each page rendered with:
   - `renderTextLayer={true}` — critical for text selection
   - `renderAnnotationLayer={false}`
   - Width set to fill the container (measure container width with a ref)
6. Shows "Loading page..." placeholder while pages render
7. Page numbers shown between pages (small, centered, gray text)

**Props:**

```ts
{
  pdfUrl: string;
  onTextSelect?: (selection: { text: string; pageNumber: number; rect: DOMRect }) => void;
}
```

The `onTextSelect` prop will be wired up in Phase 4.

**Acceptance criteria:**

- PDF renders with all pages scrollable
- Text is selectable (text layer works)
- Page numbers visible
- No console errors about canvas or workers

---

### Task 3.3 — Workspace page

**File:** `app/paper/[id]/page.tsx`

Build a client component that:

1. Reads `id` from URL params
2. Renders `WorkspaceLayout` with:
   - Left: `<PdfViewer pdfUrl={/api/pdf/${id}} />`
   - Right: `<InsightsPanel />` (empty state for now)
3. If the PDF fails to load (404), show error: "Paper not found. Upload a new one." with link back to `/`

**Acceptance criteria:**

- Navigate to `/paper/{some-id}` and see the PDF rendered on the left
- Right panel shows placeholder text
- Full flow works: upload → redirect → see PDF

---

### Task 3.4 — InsightsPanel empty state

**File:** `components/InsightsPanel.tsx`

Build a client component with three states:

1. **Empty state** (default):
   - Centered vertically
   - Icon (a lightbulb or highlight icon — use a simple SVG or emoji placeholder)
   - Text: "Highlight any passage in the paper"
   - Subtext: "Select text to get an AI-powered explanation and visual diagram"
   - Muted colors (gray-400 text)
2. **Loading state** — placeholder for Phase 6
3. **Result state** — placeholder for Phase 6

**Props:**

```ts
{
  state: "empty" | "loading" | "result";
  insight?: { explanation: any; diagram: string } | null;
  selectedText?: string;
  error?: string | null;
}
```

For now, only implement the empty state. Loading and result states will be built in Phase 6.

**Acceptance criteria:**

- Empty state looks clean and inviting
- Component accepts props for future states

---

**✅ Phase 3 checkpoint:** Full upload-to-reader flow works. User uploads a PDF, gets redirected, sees the paper in a split-screen layout with an empty insights panel on the right.

---

## Phase 4: Text Selection + Highlight Capture

### Task 4.1 — useTextSelection hook

**File:** `hooks/useTextSelection.ts`

Build a custom hook that:

1. Accepts a `containerRef: RefObject<HTMLDivElement>` (the PDF viewer container)
2. Listens for `mouseup` events within the container
3. On mouseup, checks `window.getSelection()`
4. If selection is non-empty and length >= 10 characters:
   - Extracts the selected text string
   - Determines which page the selection is on by traversing the DOM upward from the selection anchor to find the nearest element with `data-page-number` attribute (react-pdf adds this)
   - Gets the bounding rect of the selection via `selection.getRangeAt(0).getBoundingClientRect()`
   - Returns: `{ text, pageNumber, rect, isActive: true }`
5. If selection is empty or < 10 chars:
   - Returns `{ text: "", pageNumber: 0, rect: null, isActive: false }`
6. Provides a `clearSelection()` function that resets state

**Returns:**

```ts
{
  selection: {
    text: string;
    pageNumber: number;
    rect: DOMRect | null;
    isActive: boolean;
  };
  clearSelection: () => void;
}
```

**Acceptance criteria:**

- Selecting text in the PDF viewer populates the selection state
- Page number is correctly detected
- Rect is positioned near the selected text
- Clearing selection resets state
- Selections < 10 chars are ignored

---

### Task 4.2 — SelectionPopover component

**File:** `components/SelectionPopover.tsx`

Build a client component that:

1. Renders a small floating popover positioned absolutely based on a `rect` prop
2. Position: horizontally centered on the selection, vertically just below it (rect.bottom + 8px)
3. Contains a single button: "Explain" (indigo background, white text, rounded, shadow-md)
4. On click: calls `onExplain()` prop
5. Dismisses when clicking outside (listen for mousedown outside)
6. Uses `createPortal` to render in `document.body` so it's not clipped by overflow

**Props:**

```ts
{
  rect: DOMRect;
  onExplain: () => void;
  onDismiss: () => void;
}
```

**Styling:**

- Small: padding 6px 14px
- Font: text-sm, font-medium
- Shadow for depth
- Subtle fade-in animation (opacity 0 → 1, 150ms)
- Small triangle/arrow pointing up toward the selection (CSS trick or skip for v1)

**Acceptance criteria:**

- Popover appears near selected text
- "Explain" button is clickable
- Clicking outside dismisses it
- Doesn't get clipped by scroll containers

---

### Task 4.3 — Wire selection into PdfViewer and workspace

**File:** `components/PdfViewer.tsx` — update

Add a ref to the PDF container div. Use `useTextSelection` hook. When selection is active, render `<SelectionPopover>` at the selection rect.

**File:** `app/paper/[id]/page.tsx` — update

When the user clicks "Explain" in the popover:

1. Store the selected text and page number in component state
2. Set InsightsPanel to loading state
3. (The actual API call will be wired in Phase 6)

For now, clicking "Explain" should:

- Log the selection to console: `console.log({ text, pageNumber })`
- Switch the InsightsPanel to loading state
- Clear the text selection and dismiss popover

**Acceptance criteria:**

- Select text → popover appears → click "Explain" → console shows selection → panel shows loading
- Popover dismisses after clicking Explain
- New selections work after dismissing

---

**✅ Phase 4 checkpoint:** User can select text in the PDF, see a floating "Explain" button, and click it. The right panel transitions to a loading state. No API call yet.

---

## Phase 5: LLM Explanation Pipeline

### Task 5.1 — Prompt builder

**File:** `lib/prompt-builder.ts`

```ts
interface PromptInput {
  pages: { pageNum: number; text: string }[];
  selectedText: string;
  pageNumber: number;
}

export function buildExplainPrompt(input: PromptInput): string {
  const { pages, selectedText, pageNumber } = input;

  // Get surrounding context: page before, current page, page after
  const contextPages = pages.filter(
    (p) => p.pageNum >= pageNumber - 1 && p.pageNum <= pageNumber + 1
  );

  const contextText = contextPages
    .map((p) => `--- Page ${p.pageNum} ---\n${p.text}`)
    .join("\n\n");

  return `You are an expert research paper explainer. A user is reading a research paper and has highlighted a specific passage they want to understand better.

Here is the surrounding context from the paper:

${contextText}

--- HIGHLIGHTED PASSAGE ---
${selectedText}
--- END HIGHLIGHTED PASSAGE ---

Respond with a JSON object (no markdown code fences, just raw JSON) with this exact structure:

{
  "explanation": {
    "summary": "A 1-2 sentence plain-language summary of what this passage means",
    "intuition": "An intuitive explanation that helps build understanding. Use analogies if helpful. 2-4 sentences.",
    "breakdown": "A detailed step-by-step breakdown of the passage. For math/formulas, explain each term. For concepts, explain the logic. 3-6 sentences."
  },
  "diagram": {
    "type": "mermaid",
    "code": "A valid Mermaid.js diagram that visually represents the concept. Use graph TD for flowcharts, sequenceDiagram for processes, or stateDiagram-v2 for state transitions. Keep it simple — max 8-10 nodes. Do NOT use special characters or parentheses inside node labels."
  }
}

Important rules for the Mermaid diagram:
- Use simple alphanumeric node IDs (A, B, C or node1, node2)
- Keep node labels short (max 6 words per label)
- Use square brackets for labels: A[Label Here]
- Do NOT use parentheses, quotes, or special characters in labels
- Max 10 nodes
- Must be valid Mermaid syntax`;
}
```

**Acceptance criteria:**

- Produces a well-structured prompt with 3-page context
- Handles edge cases: page 1 (no previous page), last page (no next page)
- Mermaid instructions are explicit to minimize bad syntax

---

### Task 5.2 — LLM client

**File:** `lib/llm-client.ts`

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
// Uses ANTHROPIC_API_KEY from environment

export async function* streamExplanation(
  prompt: string
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
```

**Acceptance criteria:**

- Streams text chunks from Claude API
- Uses claude-sonnet-4-6 model
- Requires `ANTHROPIC_API_KEY` in `.env.local`

---

### Task 5.3 — Explain API endpoint

**File:** `app/api/explain/route.ts`

```ts
import { NextRequest } from "next/server";
import { paperStore } from "@/lib/paper-store";
import { buildExplainPrompt } from "@/lib/prompt-builder";
import { streamExplanation } from "@/lib/llm-client";

export async function POST(req: NextRequest) {
  const { paperId, selectedText, pageNumber } = await req.json();

  // Validate
  if (!paperId || !selectedText || !pageNumber) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
    });
  }

  const paper = paperStore.get(paperId);
  if (!paper) {
    return new Response(JSON.stringify({ error: "Paper not found" }), {
      status: 404,
    });
  }

  // Build prompt
  const prompt = buildExplainPrompt({
    pages: paper.pages,
    selectedText,
    pageNumber,
  });

  // Stream response as SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamExplanation(prompt)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "LLM request failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Acceptance criteria:**

- POST with valid paperId/selectedText/pageNumber returns SSE stream
- Stream contains text chunks
- Stream ends with `[DONE]`
- Invalid requests return proper errors
- LLM failures are caught and reported

---

### Task 5.4 — Create `.env.local` template

**File:** `.env.local.example`

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

Add `.env.local` to `.gitignore` if not already there.

**Acceptance criteria:**

- Template file exists
- `.env.local` is gitignored

---

**✅ Phase 5 checkpoint:** The `/api/explain` endpoint works. You can test it with curl or Postman: upload a PDF, then POST to `/api/explain` with the paperId, some selected text, and a page number, and get back a streamed explanation.

---

## Phase 6: Results UI

### Task 6.1 — useStreamingExplain hook

**File:** `hooks/useStreamingExplain.ts`

Build a hook that:

1. Exposes `requestExplanation(paperId, selectedText, pageNumber)` function
2. When called:
   - Sets `isLoading = true`
   - POSTs to `/api/explain`
   - Reads the SSE stream using `EventSource` or manual fetch + ReadableStream reader
   - Accumulates text chunks into a `rawResponse` string
   - When stream ends (`[DONE]`), parses the accumulated string as JSON
   - Sets `result` to the parsed `{ explanation, diagram }`
   - Sets `isLoading = false`
3. On parse error (bad JSON):
   - Try to extract explanation text even if diagram JSON is malformed
   - Set `error` state
4. Exposes: `{ isLoading, result, error, rawResponse, requestExplanation }`

**Implementation note:** Use `fetch` with `getReader()` rather than `EventSource` for better control:

```ts
const response = await fetch("/api/explain", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ paperId, selectedText, pageNumber }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let accumulated = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE lines, extract text, accumulate
}
```

**Acceptance criteria:**

- Streams response and accumulates text
- Parses final JSON correctly
- Handles malformed JSON gracefully
- Exposes loading/error/result states

---

### Task 6.2 — ExplanationCard component

**File:** `components/ExplanationCard.tsx`

Build a client component that renders the structured explanation:

1. **Summary section:**
   - Label: "Summary" (text-xs, uppercase, font-semibold, text-gray-400, tracking-wide)
   - Content: text-base, text-gray-800
   - Bottom border separator

2. **Intuition section:**
   - Label: "Intuition"
   - Content: text-base, text-gray-700

3. **Breakdown section:**
   - Label: "Step-by-step Breakdown"
   - Content: text-sm, text-gray-700
   - Slightly different background (gray-50 rounded box)

**Props:**

```ts
{
  explanation: {
    summary: string;
    intuition: string;
    breakdown: string;
  };
}
```

**Styling:**

- Clean card with white background, rounded-lg, subtle border
- Generous padding (p-6)
- Sections separated by subtle dividers or spacing
- No bold colors — let the content speak

**Acceptance criteria:**

- Renders all three sections cleanly
- Handles long text gracefully (wraps, no overflow)
- Looks polished and readable

---

### Task 6.3 — DiagramRenderer component

**File:** `components/DiagramRenderer.tsx`

Build a client component that:

1. Accepts `mermaidCode: string` prop
2. On mount / code change:
   - Calls `mermaid.render('diagram-' + id, mermaidCode)` in a useEffect
   - Sets the resulting SVG HTML into state
   - Renders via `dangerouslySetInnerHTML`
3. On render error:
   - Catches the error
   - Shows fallback: "Diagram could not be rendered" in a gray box
   - Does NOT crash the app
4. Wraps in a container with:
   - Background: white or gray-50
   - Border: subtle rounded border
   - Padding: p-4
   - Overflow: auto (in case diagram is wide)
   - Label above: "Visual Diagram" (same label style as ExplanationCard sections)

**Critical:** Initialize mermaid with `mermaid.initialize({ startOnLoad: false, theme: 'neutral' })` once, not on every render.

**Props:**

```ts
{
  mermaidCode: string;
}
```

**Acceptance criteria:**

- Valid Mermaid code renders as an SVG diagram
- Invalid Mermaid code shows graceful fallback, no crash
- Diagram is styled consistently with the explanation card

---

### Task 6.4 — SkeletonLoader component

**File:** `components/SkeletonLoader.tsx`

Build a simple loading skeleton for the insights panel:

1. Three animated gray rectangles representing the explanation sections
2. One larger animated rectangle representing the diagram
3. Use Tailwind's `animate-pulse` on `bg-gray-200 rounded` divs
4. Match the approximate layout of ExplanationCard + DiagramRenderer

**Acceptance criteria:**

- Looks like a plausible loading state for the real content
- Pulse animation works

---

### Task 6.5 — Complete InsightsPanel

**File:** `components/InsightsPanel.tsx` — update from Task 3.4

Implement all three states:

1. **Empty state:** (already done in 3.4)
2. **Loading state:**
   - Show the highlighted text in a blockquote at top (indigo-50 bg, indigo-600 left border)
   - Below: `<SkeletonLoader />`
3. **Result state:**
   - Show the highlighted text in a blockquote at top
   - Below: `<ExplanationCard />`
   - Below: `<DiagramRenderer />`
4. **Error state:**
   - Show error message in a red-50 box
   - "Retry" button that calls `onRetry` prop

**Props:**

```ts
{
  state: "empty" | "loading" | "result" | "error";
  selectedText?: string;
  insight?: {
    explanation: { summary: string; intuition: string; breakdown: string };
    diagram: { type: string; code: string };
  } | null;
  error?: string | null;
  onRetry?: () => void;
}
```

**Acceptance criteria:**

- All four states render correctly
- Transitions between states feel natural
- Blockquote of selected text persists across loading → result

---

### Task 6.6 — Wire everything together in the workspace

**File:** `app/paper/[id]/page.tsx` — update

This is the integration task. Update the workspace page to:

1. Use `useStreamingExplain` hook
2. When user clicks "Explain" in SelectionPopover:
   - Store `selectedText` and `pageNumber` in state
   - Call `requestExplanation(paperId, selectedText, pageNumber)`
   - Dismiss popover
3. Pass the correct state/props to InsightsPanel:
   - `state` derived from hook: empty → loading → result/error
   - `selectedText` from stored state
   - `insight` from hook result
   - `error` from hook error
   - `onRetry` re-calls `requestExplanation` with the same params

**Acceptance criteria:**

- **THE FULL FLOW WORKS END TO END:**
  1. Upload PDF on landing page
  2. See PDF in reader
  3. Select text in PDF
  4. Click "Explain"
  5. See loading skeleton
  6. See explanation + diagram stream in
- Retry works on error
- Can do multiple highlights in sequence

---

**✅ Phase 6 checkpoint:** The entire core interaction works. This is the MVP.

---

## Phase 7: Polish

### Task 7.1 — Error handling sweep

Go through every component and API route. Ensure:

- API routes return proper HTTP status codes and error messages
- Components show user-friendly errors, not technical stack traces
- Network failures (offline, timeout) are caught in `useStreamingExplain`
- PDF load failures show a message with a link back to upload
- Add a try/catch to Mermaid rendering

No new files. Update existing files.

**Acceptance criteria:**

- No unhandled promise rejections
- No white-screen crashes
- Every error the user could hit has a human-readable message

---

### Task 7.2 — Loading and transition polish

- Add `transition-opacity duration-150` to InsightsPanel state changes
- Ensure SkeletonLoader matches the real content layout closely
- Add a subtle fade-in when explanation card appears
- Make the SelectionPopover fade in (opacity 0→1, 100ms)

No new files. Update existing files.

**Acceptance criteria:**

- State transitions feel smooth, not jarring
- No layout shifts when switching between states

---

### Task 7.3 — Selection edge cases

Handle these edge cases in `useTextSelection` and `SelectionPopover`:

- Selection shorter than 10 characters: ignore silently
- Selection longer than 2000 characters: truncate and show a note: "Selection trimmed to 2000 characters"
- Selection spanning multiple pages: use the page number of the selection start
- Double-click (word select) + triple-click (paragraph select): both should work
- Selection outside PDF viewer area: ignore

No new files. Update existing files.

**Acceptance criteria:**

- All edge cases handled gracefully
- No console errors on weird selections

---

### Task 7.4 — README and setup instructions

**File:** `README.md`

Write a clear README with:

- Project description (2 sentences)
- Prerequisites: Node 18+, npm, Anthropic API key
- Setup steps:
  1. `npm install`
  2. Copy `.env.local.example` to `.env.local` and add API key
  3. `npm run dev`
  4. Open `http://localhost:3000`
- Tech stack list
- Screenshot placeholder

**Acceptance criteria:**

- A new developer can get the app running by following the README

---

**✅ Phase 7 checkpoint:** The app is demo-ready. Clean, handles errors, feels polished.

---

## Appendix A: Full Dependency List

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "^14",
    "react-pdf": "^7",
    "pdfjs-dist": "^3",
    "pdf-parse": "^1.1.1",
    "@anthropic-ai/sdk": "^0.30",
    "mermaid": "^10"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/pdf-parse": "^1",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "^14"
  }
}
```

## Appendix B: Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key from console.anthropic.com |

## Appendix C: API Route Summary

| Method | Route | Request Body | Response |
|--------|-------|-------------|----------|
| `POST` | `/api/upload` | `FormData { file: PDF }` | `{ paperId, title, pageCount }` |
| `GET` | `/api/pdf/[id]` | — | Raw PDF binary |
| `POST` | `/api/explain` | `{ paperId, selectedText, pageNumber }` | SSE stream → `{ explanation, diagram }` |

## Appendix D: Component Tree

```
RootLayout
├── LandingPage (app/page.tsx)
│   └── UploadZone
│
└── WorkspacePage (app/paper/[id]/page.tsx)
    └── WorkspaceLayout
        ├── PdfViewer (left panel)
        │   └── SelectionPopover (portal)
        └── InsightsPanel (right panel)
            ├── SkeletonLoader (loading state)
            ├── ExplanationCard (result state)
            └── DiagramRenderer (result state)
```

## Appendix E: First 5 Codex Prompts (in order)

**Prompt 1:**
> Initialize a Next.js 14 project with TypeScript, Tailwind CSS, ESLint, and App Router in the current directory. Install these npm packages: react-pdf, pdfjs-dist, pdf-parse, @anthropic-ai/sdk, mermaid, and @types/pdf-parse (dev). Configure next.config.js to set canvas alias to false for pdf.js compatibility. Create the folder structure: components/, hooks/, lib/, app/paper/[id]/, app/api/upload/, app/api/pdf/[id]/, app/api/explain/. Create lib/pdf-worker-setup.ts that sets the pdf.js worker source. Update app/globals.css with Inter font and indigo selection highlight color. Verify the app builds and runs with `npm run dev`.

**Prompt 2:**
> Build the landing page and PDF upload flow. Create components/UploadZone.tsx — a drag-and-drop file upload component that accepts only PDF files under 50MB, shows validation errors, and has visual states for default, drag-hover, and error. Update app/page.tsx to render a centered landing page with the title "Interactive Research Agent", a subtitle, and the UploadZone. When a file is selected, show an upload progress state, POST the file as FormData to /api/upload, and on success redirect to /paper/{paperId}. Create lib/pdf-parser.ts (extracts text per page using pdf-parse), lib/paper-store.ts (in-memory Map), app/api/upload/route.ts (saves PDF to /tmp, parses it, stores it, returns {paperId, title, pageCount}), and app/api/pdf/[id]/route.ts (serves the raw PDF file). Create .env.local.example with ANTHROPIC_API_KEY placeholder.

**Prompt 3:**
> Build the split-screen workspace and PDF viewer. Create components/WorkspaceLayout.tsx — a full-height split-panel layout (55% left, 45% right) with independent scrolling and a thin divider. Create components/PdfViewer.tsx — renders a PDF from a URL using react-pdf with all pages stacked vertically, text layer enabled for selection, page numbers shown between pages. Create components/InsightsPanel.tsx with an empty state showing "Highlight any passage in the paper" message. Create app/paper/[id]/page.tsx that renders WorkspaceLayout with PdfViewer on the left loading from /api/pdf/{id} and InsightsPanel on the right. Handle PDF load errors with a user-friendly message.

**Prompt 4:**
> Build the text selection and highlight system. Create hooks/useTextSelection.ts — a custom hook that detects text selection within a container ref, extracts the selected string (minimum 10 chars), determines the page number from react-pdf's data-page-number attribute, and returns { text, pageNumber, rect, isActive }. Create components/SelectionPopover.tsx — a floating popover rendered via createPortal, positioned below the selection rect, containing an "Explain" button with indigo styling and shadow. Wire these into PdfViewer.tsx: when text is selected, show the popover; when "Explain" is clicked, call an onExplain callback with { text, pageNumber }. Update the workspace page to handle the explain callback by storing the selection in state and logging it.

**Prompt 5:**
> Build the full LLM explanation pipeline and results UI. Create lib/prompt-builder.ts that builds a Claude prompt with 3-page context around the selected passage, requesting a JSON response with explanation (summary, intuition, breakdown) and a Mermaid diagram. Create lib/llm-client.ts that wraps the Anthropic SDK to stream a response. Create app/api/explain/route.ts — a POST endpoint that looks up the paper, builds the prompt, streams the Claude response as SSE. Create hooks/useStreamingExplain.ts that POSTs to /api/explain, reads the SSE stream, accumulates text, and parses the final JSON. Create components/ExplanationCard.tsx (renders summary, intuition, breakdown sections), components/DiagramRenderer.tsx (renders Mermaid code as SVG with error fallback), and components/SkeletonLoader.tsx (animated loading placeholder). Update InsightsPanel.tsx to support loading, result, and error states. Wire everything together in the workspace page so the full flow works: select text → click Explain → see streamed explanation and diagram.
