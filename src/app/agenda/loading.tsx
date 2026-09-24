import * as React from "react";

export default function AgendaLoading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 animate-pulse">
      {/* 1. Header Skeleton */}
      <div className="w-full space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Navigation Skeleton */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-muted/80" />
              <div className="space-y-1.5">
                <div className="h-6 w-48 rounded-md bg-muted/80" />
                <div className="h-3.5 w-64 rounded-md bg-muted/50" />
              </div>
            </div>

            {/* Date controls skeleton */}
            <div className="flex items-center gap-1.5 ml-0 sm:ml-4 bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
              <div className="h-8 w-12 rounded-lg bg-muted/60" />
              <div className="h-4 w-px bg-border/80 mx-0.5" />
              <div className="size-8 rounded-lg bg-muted/60" />
              <div className="size-8 rounded-lg bg-muted/60" />
              <div className="h-8 w-28 rounded-lg bg-muted/60 ml-1" />
            </div>
          </div>

          {/* Right Controls Skeleton */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-28 rounded-xl bg-muted/60 border border-border/80" />
            <div className="h-9 w-32 rounded-xl bg-cyan-600/30" />
          </div>
        </div>

        {/* Doctor Filters Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-muted/60" />
            <div className="h-7 w-20 rounded-lg bg-muted/80" />
            <div className="h-7 w-32 rounded-lg bg-muted/60" />
            <div className="h-7 w-32 rounded-lg bg-muted/60" />
            <div className="h-7 w-32 rounded-lg bg-muted/60" />
          </div>
          <div className="h-8 w-44 rounded-lg bg-muted/60 border border-border" />
        </div>
      </div>

      {/* 2. Main Grid Skeleton */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Doctor Column Headers */}
        <div className="flex border-b border-border/80 bg-muted/30">
          <div className="w-16 sm:w-20 shrink-0 border-r border-border/60 p-3 flex items-center justify-center">
            <div className="h-3 w-8 rounded bg-muted/80" />
          </div>

          <div className="flex-1 grid grid-cols-3 divide-x divide-border/60">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 sm:px-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-muted/80" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-28 rounded bg-muted/80" />
                    <div className="h-2.5 w-20 rounded bg-muted/50" />
                  </div>
                </div>
                <div className="h-4 w-12 rounded-full bg-muted/60 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>

        {/* Grid Body with faux appointment cards */}
        <div className="flex" style={{ height: "600px" }}>
          {/* Time column */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-border/60 bg-muted/10 p-2 space-y-16">
            {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"].map((t) => (
              <div key={t} className="h-3 w-10 mx-auto rounded bg-muted/50" />
            ))}
          </div>

          {/* Lanes */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-border/60 relative">
            {/* Lane 1 */}
            <div className="relative p-2 space-y-4">
              <div className="mt-8 h-20 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 space-y-1.5" />
              <div className="mt-16 h-32 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 space-y-1.5" />
            </div>

            {/* Lane 2 */}
            <div className="relative p-2 space-y-4">
              <div className="mt-20 h-28 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 space-y-1.5" />
              <div className="mt-8 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 space-y-1.5" />
            </div>

            {/* Lane 3 */}
            <div className="relative p-2 space-y-4">
              <div className="mt-12 h-36 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 space-y-1.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
