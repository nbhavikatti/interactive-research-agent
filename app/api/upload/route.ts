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

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const id = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    const [parsed, pdfBlobUrl] = await Promise.all([
      parsePdf(buffer, file.name),
      paperStore.savePdf(id, buffer),
    ]);

    await paperStore.set(id, {
      id,
      filename: file.name,
      pdfBlobUrl,
      title: parsed.title,
      pages: parsed.pages,
    });

    return NextResponse.json({
      paperId: id,
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
