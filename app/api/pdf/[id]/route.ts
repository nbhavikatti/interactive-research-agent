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
    const res = await fetch(paper.pdfBlobUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Could not read PDF file" }, { status: 500 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${paper.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not read PDF file" }, { status: 500 });
  }
}
