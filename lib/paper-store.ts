import { put, list } from "@vercel/blob";

export interface StoredPaperPage {
  pageNum: number;
  text: string;
}

export interface StoredPaper {
  id: string;
  filename: string;
  pdfBlobUrl: string;
  title: string;
  pages: StoredPaperPage[];
}

function metadataPath(id: string) {
  return `papers/${id}/metadata.json`;
}

function pdfPath(id: string) {
  return `papers/${id}/file.pdf`;
}

const metadataCache = new Map<string, StoredPaper>();

export const paperStore = {
  async savePdf(id: string, buffer: Buffer): Promise<string> {
    const blob = await put(pdfPath(id), buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });
    return blob.url;
  },

  async set(id: string, paper: StoredPaper): Promise<void> {
    metadataCache.set(id, paper);
    // Fire-and-forget: persist to blob storage in the background.
    // The in-memory cache serves reads immediately.
    put(metadataPath(id), JSON.stringify(paper), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    }).catch((err) => {
      console.error(`[paper-store] Failed to persist metadata for ${id}:`, err);
    });
  },

  async get(id: string): Promise<StoredPaper | undefined> {
    const cached = metadataCache.get(id);
    if (cached) return cached;

    try {
      const blobList = await list({ prefix: metadataPath(id) });
      const match = blobList.blobs[0];
      if (!match) return undefined;

      const res = await fetch(match.url);
      if (!res.ok) return undefined;
      const paper = (await res.json()) as StoredPaper;
      metadataCache.set(id, paper);
      return paper;
    } catch {
      return undefined;
    }
  },
};
