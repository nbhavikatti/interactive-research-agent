"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }

      router.push(`/paper/${payload.paperId}`);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload your paper.",
      );
      setIsUploading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Animated gradient background */}
      <div className="animate-gradient-shift absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />

      {/* Floating decorative blobs */}
      <div className="animate-float animate-pulse-soft pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="animate-float-delayed animate-pulse-soft pointer-events-none absolute -right-16 top-1/4 h-60 w-60 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="animate-float pointer-events-none absolute -bottom-10 left-1/3 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        {/* Header */}
        <div className="animate-fade-in-up space-y-4">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Interactive Research{" "}
            <span className="animate-shimmer bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Agent
            </span>
          </h1>
          <p className="animate-fade-in-up-delay-1 mx-auto max-w-lg text-lg text-gray-500">
            Upload a research paper. Highlight any passage. Get instant
            explanations and visuals.
          </p>
        </div>

        {/* Upload area */}
        <div className="animate-fade-in-up-delay-2 w-full">
          {isUploading ? (
            <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-indigo-500/5 backdrop-blur-lg">
              <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="animate-shimmer h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Uploading and parsing your paper...
              </p>
            </div>
          ) : (
            <UploadZone onFileSelected={handleFileSelected} />
          )}
        </div>

        {error ? (
          <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50/80 p-4 text-left text-sm text-red-700 backdrop-blur-sm">
            <p>{error}</p>
            <button
              className="mt-3 inline-flex rounded-full border border-red-300 px-4 py-2 font-medium text-red-700 transition hover:bg-red-100"
              onClick={() => {
                setError(null);
                setIsUploading(false);
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
