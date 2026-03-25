"""
Manim render server.
Accepts Manim Python code, executes it in a sandboxed subprocess,
and returns the rendered MP4 video.
"""

import asyncio
import os
import shutil
import tempfile
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Manim Render Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Limits
MAX_CODE_LENGTH = 10_000  # chars
RENDER_TIMEOUT_SECONDS = 60
MAX_OUTPUT_SIZE_MB = 50


class RenderRequest(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    scene_name: str = Field(default="ConceptScene", max_length=100)
    quality: str = Field(default="low_quality")  # low_quality, medium_quality, high_quality


class RenderResponse(BaseModel):
    status: str
    message: str
    video_url: str | None = None


# Safety: block dangerous imports/calls
BLOCKED_PATTERNS = [
    "import os",
    "import sys",
    "import subprocess",
    "import shutil",
    "import socket",
    "import http",
    "import urllib",
    "import requests",
    "__import__",
    "eval(",
    "exec(",
    "compile(",
    "open(",
    "os.system",
    "os.popen",
    "os.exec",
    "os.spawn",
    "os.remove",
    "os.unlink",
    "os.rmdir",
    "shutil.rmtree",
    "pathlib",
]


def validate_code(code: str) -> str | None:
    """Return an error message if the code contains dangerous patterns."""
    code_lower = code.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in code_lower:
            return f"Blocked pattern detected: {pattern}"
    return None


QUALITY_FLAGS = {
    "low_quality": "-ql",
    "medium_quality": "-qm",
    "high_quality": "-qh",
}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/render")
async def render(req: RenderRequest):
    # Validate code safety
    error = validate_code(req.code)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Create isolated temp directory for this render
    render_id = uuid.uuid4().hex[:12]
    work_dir = tempfile.mkdtemp(prefix=f"manim_{render_id}_")

    try:
        # Write the scene file
        scene_path = os.path.join(work_dir, "scene.py")
        with open(scene_path, "w") as f:
            f.write(req.code)

        # Build manim command
        quality_flag = QUALITY_FLAGS.get(req.quality, "-ql")
        cmd = [
            "manim",
            quality_flag,
            "--format=mp4",
            "--media_dir", os.path.join(work_dir, "media"),
            scene_path,
            req.scene_name,
        ]

        # Execute with timeout
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=work_dir,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=RENDER_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            raise HTTPException(
                status_code=408,
                detail=f"Render timed out after {RENDER_TIMEOUT_SECONDS}s",
            )

        if process.returncode != 0:
            error_output = stderr.decode("utf-8", errors="replace")[-1000:]
            raise HTTPException(
                status_code=422,
                detail=f"Manim render failed:\n{error_output}",
            )

        # Find the output video file
        media_dir = os.path.join(work_dir, "media", "videos", "scene")
        video_path = None

        for root, _dirs, files in os.walk(media_dir):
            for f in files:
                if f.endswith(".mp4"):
                    video_path = os.path.join(root, f)
                    break
            if video_path:
                break

        if not video_path or not os.path.exists(video_path):
            raise HTTPException(
                status_code=500,
                detail="Render completed but no video file was produced",
            )

        # Check file size
        size_mb = os.path.getsize(video_path) / (1024 * 1024)
        if size_mb > MAX_OUTPUT_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"Output video too large: {size_mb:.1f}MB (max {MAX_OUTPUT_SIZE_MB}MB)",
            )

        # Return the video file directly
        # The caller is responsible for storing it (e.g., in Vercel Blob)
        return FileResponse(
            video_path,
            media_type="video/mp4",
            filename=f"{render_id}.mp4",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp directory after a delay to let FileResponse finish
        # In production, use a background task or cleanup cron
        asyncio.get_event_loop().call_later(30, shutil.rmtree, work_dir, True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
