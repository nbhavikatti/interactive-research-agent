import { NextResponse } from "next/server";
import { paperStore } from "@/lib/paper-store";
import { renderFirstPagePngBuffer } from "@/lib/pdf-page-image";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const paper = await paperStore.get(params.id);
  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  try {
    const pdfResponse = await fetch(paper.pdfBlobUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "Could not read PDF file" },
        { status: 500 },
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const imageBuffer = await renderFirstPagePngBuffer(pdfBuffer);

    const body = new Blob([Uint8Array.from(imageBuffer)], { type: "image/png" });

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename=\"${paper.id}-first-page.png\"`,
        "Content-Type": "image/png",
      },
    });
  } catch (errorValue) {
    const message =
      errorValue instanceof Error
        ? errorValue.message
        : "Unknown render error";

    return NextResponse.json(
      { error: "Could not render first-page preview", detail: message },
      { status: 500 },
    );
  }
}
