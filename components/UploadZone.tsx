"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  helperText?: string;
  supportingText?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function UploadZone({
  onFileSelected,
  disabled = false,
  helperText = "Upload up to 5 research papers and we will provide cross-paper insights and analysis.",
  supportingText = "PDF only, up to 50MB each",
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSubmit = (file: File | null) => {
    if (!file) {
      return;
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Only PDF files are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("PDFs must be smaller than 50MB.");
      return;
    }

    setError(null);
    onFileSelected(file);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    validateAndSubmit(event.dataTransfer.files[0] ?? null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      event.target.value = "";
      return;
    }
    validateAndSubmit(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <button
        className={`group flex min-h-[280px] w-full flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed px-10 py-12 text-center backdrop-blur-lg transition-all duration-300 ${
          disabled
            ? "cursor-not-allowed border-slate-800 bg-slate-950/60 opacity-70 shadow-none"
            : ""
        } ${
          isDragging
            ? "scale-[1.02] border-cyan-400/80 bg-slate-900/95 shadow-xl shadow-cyan-500/10"
            : "border-slate-800/90 bg-slate-950/72 shadow-lg shadow-black/30 hover:border-sky-400/50 hover:bg-slate-950/88 hover:shadow-xl hover:shadow-sky-500/10"
        }`}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        type="button"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold tracking-[0.15em] text-slate-950 shadow-lg shadow-cyan-500/25 transition-transform duration-300 group-hover:scale-110">
          PDF
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-slate-100">
            Drag and drop a PDF or click to upload
          </p>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate-400">
            {helperText}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-300/80">
            {supportingText}
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        accept=".pdf,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
        type="file"
      />

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
