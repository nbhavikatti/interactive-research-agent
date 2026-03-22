import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface StoredPaperPage {
  pageNum: number;
  text: string;
}

export interface StoredPaper {
  id: string;
  filename: string;
  filePath: string;
  title: string;
  pages: StoredPaperPage[];
}

class PaperStore {
  private papers = new Map<string, StoredPaper>();
  private storeDir = path.join("/tmp", "uploads");

  async set(id: string, paper: StoredPaper) {
    this.papers.set(id, paper);
    await mkdir(this.storeDir, { recursive: true });
    await writeFile(this.getMetadataPath(id), JSON.stringify(paper), "utf8");
  }

  async get(id: string): Promise<StoredPaper | undefined> {
    const cached = this.papers.get(id);
    if (cached) {
      return cached;
    }

    try {
      const raw = await readFile(this.getMetadataPath(id), "utf8");
      const paper = JSON.parse(raw) as StoredPaper;
      this.papers.set(id, paper);
      return paper;
    } catch {
      return undefined;
    }
  }

  async has(id: string): Promise<boolean> {
    return (await this.get(id)) !== undefined;
  }

  private getMetadataPath(id: string) {
    return path.join(this.storeDir, `${id}.json`);
  }
}

export const paperStore = new PaperStore();
