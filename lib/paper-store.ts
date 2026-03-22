import { put, head, list } from "@vercel/blob";

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

export const paperStore = {
  async savePdf(id: string, buffer: Buffer, filename: string): Promise<string> {
    const blob = await put(pdfPath(id), buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });
    return blob.url;
  },

  async set(id: string, paper: StoredPaper): Promise<void> {
    await put(metadataPath(id), JSON.stringify(paper), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  },

  async get(id: string): Promise<StoredPaper | undefined> {
    try {
      const blobList = await list({ prefix: metadataPath(id) });
      const match = blobList.blobs[0];
      if (!match) return undefined;

      const res = await fetch(match.url);
      if (!res.ok) return undefined;
      return (await res.json()) as StoredPaper;
    } catch {
      return undefined;
    }
  },
};
