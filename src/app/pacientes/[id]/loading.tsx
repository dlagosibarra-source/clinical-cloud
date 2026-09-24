import * as React from "react";

export default function PatientProfileLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-muted/70 border border-border/60" />
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-muted/80" />
            <div className="space-y-1.5">
              <div className="h-6 w-48 rounded-md bg-muted/80" />
              <div className="h-3.5 w-64 rounded-md bg-muted/50" />
            </div>
          </div>
        </div>

        <div className="h-10 w-36 rounded-xl bg-cyan-600/30" />
      </div>

      {/* 2. 2-Column Skeleton Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="h-4 w-32 rounded bg-muted/70" />
              <div className="h-6 w-14 rounded-lg bg-muted/50" />
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-3.5 w-20 rounded bg-muted/60" />
                  <div className="h-3.5 w-32 rounded bg-muted/70" />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 (Metrics) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="h-4 w-36 rounded bg-muted/70" />
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/40 h-16" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Timeline Skeleton (8 cols) */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="space-y-1">
                <div className="h-5 w-48 rounded bg-muted/80" />
                <div className="h-3 w-64 rounded bg-muted/50" />
              </div>
              <div className="h-6 w-20 rounded-full bg-muted/60" />
            </div>

            {/* Timeline cards */}
            <div className="pl-6 space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2.5">
                  <div className="flex justify-between">
                    <div className="h-4 w-44 rounded bg-muted/80" />
                    <div className="h-5 w-20 rounded-full bg-muted/60" />
                  </div>
                  <div className="flex justify-between pt-1">
                    <div className="h-3.5 w-36 rounded bg-muted/60" />
                    <div className="h-3.5 w-28 rounded bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
