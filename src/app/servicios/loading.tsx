import * as React from "react";

export default function ServiciosLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1.5">
        <div className="h-8 w-72 rounded-lg bg-muted/80" />
        <div className="h-4 w-[28rem] rounded-md bg-muted/50" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
            <div className="h-4 w-28 rounded bg-muted/60" />
            <div className="h-7 w-16 rounded bg-muted/80" />
            <div className="h-3 w-36 rounded bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
        <div className="h-10 w-full max-w-md rounded-xl bg-muted/60" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-xl bg-muted/60" />
          <div className="h-10 w-36 rounded-xl bg-cyan-600/30" />
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-3/4 rounded bg-muted/80" />
                <div className="h-3.5 w-1/3 rounded bg-muted/50" />
              </div>
              <div className="h-6 w-16 rounded-full bg-muted/60" />
            </div>
            <div className="h-12 rounded bg-muted/40" />
            <div className="flex justify-between items-center pt-2 border-t border-border/60">
              <div className="h-6 w-20 rounded bg-muted/70" />
              <div className="h-8 w-24 rounded-lg bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
