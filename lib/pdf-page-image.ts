import { createCanvas } from "canvas";

export async function renderFirstPagePngBuffer(buffer: Buffer): Promise<Buffer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context as never,
      viewport,
    }).promise;

    return canvas.toBuffer("image/png");
  } finally {
    await pdf.destroy();
  }
}

export async function renderFirstPageImage(buffer: Buffer): Promise<string> {
  const pngBuffer = await renderFirstPagePngBuffer(buffer);
  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}
