/**
 * Client for the Manim render server.
 * Sends generated Manim code to the render server and returns the video as a Buffer.
 */

function getRenderServerUrl(): string {
  return process.env.MANIM_RENDER_URL || "http://localhost:8000";
}
const RENDER_TIMEOUT_MS = 90_000; // 90s — rendering can be slow

interface RenderOptions {
  code: string;
  sceneName?: string;
  quality?: "low_quality" | "medium_quality" | "high_quality";
}

export interface RenderResult {
  success: true;
  videoBuffer: Buffer;
  contentType: string;
}

export interface RenderError {
  success: false;
  error: string;
}

export async function renderManimVideo(
  options: RenderOptions,
): Promise<RenderResult | RenderError> {
  const { code, sceneName = "ConceptScene", quality = "low_quality" } = options;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

    const response = await fetch(`${getRenderServerUrl()}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, scene_name: sceneName, quality }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const detail = await response.text().catch(() => "Unknown error");
      return { success: false, error: `Render server error (${response.status}): ${detail}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      success: true,
      videoBuffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type") || "video/mp4",
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Render request timed out" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown render error",
    };
  }
}
