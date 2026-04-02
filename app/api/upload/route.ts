import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { parsePdf } from "@/lib/pdf-parser";
import { paperStore } from "@/lib/paper-store";
import { rateLimit } from "@/lib/rate-limit";

// 10 uploads per IP per 15 minutes
const RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const firstPageImageValue = formData.get("firstPageImage");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const firstPageImage =
      typeof firstPageImageValue === "string" &&
      firstPageImageValue.startsWith("data:image/")
        ? firstPageImageValue
        : null;

    const id = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const firstPagePreviewBuffer = firstPageImage
      ? decodeDataUrlImage(firstPageImage)
      : null;

    const [parsed, pdfBlobUrl, firstPagePreviewUrl] = await Promise.all([
      parsePdf(buffer, file.name, firstPageImage),
      paperStore.savePdf(id, buffer),
      firstPagePreviewBuffer
        ? paperStore.saveFirstPagePreview(id, firstPagePreviewBuffer)
        : Promise.resolve(null),
    ]);

    await paperStore.set(id, {
      id,
      filename: file.name,
      firstPagePreviewUrl,
      pdfBlobUrl,
      title: parsed.title,
      pages: parsed.pages,
    });

    return NextResponse.json({
      paperId: id,
      firstPagePreviewUrl: firstPagePreviewUrl
        ? `/api/pdf-preview/${id}`
        : null,
      title: parsed.title,
      pageCount: parsed.pages.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not upload and parse the PDF." },
      { status: 500 },
    );
  }
}

function decodeDataUrlImage(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid first-page image");
  }

  return Buffer.from(match[1], "base64");
}
