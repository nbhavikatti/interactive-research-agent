import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { paperStore } from "@/lib/paper-store";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const paper = await paperStore.get(params.id);
  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(paper.filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${paper.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not read PDF file" }, { status: 500 });
  }
}
