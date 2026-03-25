FROM python:3.11-slim

# Install system deps for Manim (Cairo, Pango, FFmpeg, LaTeX)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-science \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
RUN pip install --no-cache-dir \
    manim==0.18.1 \
    fastapi==0.115.* \
    uvicorn[standard]==0.34.* \
    python-multipart==0.0.*

WORKDIR /app
COPY server.py .

# Create temp directory for renders
RUN mkdir -p /tmp/manim_renders

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
