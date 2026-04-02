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

  if (!paper.firstPagePreviewUrl) {
    return NextResponse.json(
      { error: "First-page preview not available for this paper" },
      { status: 404 },
    );
  }

  try {
    const imageResponse = await fetch(paper.firstPagePreviewUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Could not read first-page preview" },
        { status: 500 },
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    return new Response(new Blob([Uint8Array.from(imageBuffer)], { type: "image/png" }), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${paper.id}-first-page.png"`,
        "Content-Type": "image/png",
      },
    });
  } catch (errorValue) {
    const message =
      errorValue instanceof Error ? errorValue.message : "Unknown preview error";

    return NextResponse.json(
      { error: "Could not read first-page preview", detail: message },
      { status: 500 },
    );
  }
}
