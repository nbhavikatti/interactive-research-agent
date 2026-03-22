"use client";

export function SkeletonLoader() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-5 w-11/12 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-gray-200" />

        <div className="mt-8 h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-5 w-full animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-5 w-5/6 animate-pulse rounded bg-gray-200" />

        <div className="mt-8 h-4 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-28 w-full animate-pulse rounded-2xl bg-gray-200" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-56 w-full animate-pulse rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}
