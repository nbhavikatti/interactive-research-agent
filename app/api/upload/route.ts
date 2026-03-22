import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { parsePdf } from "@/lib/pdf-parser";
import { paperStore } from "@/lib/paper-store";

export async function POST(req: NextRequest) {
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
      parsePdf(buffer),
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
