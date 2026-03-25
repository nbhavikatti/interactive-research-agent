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

  return NextResponse.redirect(paper.pdfBlobUrl, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
