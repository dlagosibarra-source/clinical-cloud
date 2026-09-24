import * as React from "react";

export default function PacientesLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-1.5">
        <div className="h-8 w-64 rounded-lg bg-muted/80" />
        <div className="h-4 w-96 rounded-md bg-muted/50" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
        <div className="h-10 w-full max-w-md rounded-xl bg-muted/60" />
        <div className="h-10 w-36 rounded-xl bg-cyan-600/30" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-border/80 bg-muted/30">
          <div className="col-span-4 h-3 w-20 rounded bg-muted/80" />
          <div className="col-span-3 h-3 w-20 rounded bg-muted/80" />
          <div className="col-span-2 h-3 w-20 rounded bg-muted/80" />
          <div className="col-span-1 h-3 w-10 mx-auto rounded bg-muted/80" />
          <div className="col-span-2 h-3 w-16 ml-auto rounded bg-muted/80" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              {/* Patient */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="size-9 rounded-full bg-muted/80 shrink-0" />
                <div className="space-y-1">
                  <div className="h-4 w-36 rounded bg-muted/80" />
                  <div className="h-2.5 w-24 rounded bg-muted/50" />
                </div>
              </div>

              {/* Contact */}
              <div className="col-span-3 space-y-1">
                <div className="h-3.5 w-32 rounded bg-muted/70" />
                <div className="h-3 w-40 rounded bg-muted/50" />
              </div>

              {/* Last Appointment */}
              <div className="col-span-2">
                <div className="h-3.5 w-24 rounded bg-muted/70" />
              </div>

              {/* Total Appointments */}
              <div className="col-span-1 flex justify-center">
                <div className="h-5 w-6 rounded-full bg-muted/60" />
              </div>

              {/* Actions */}
              <div className="col-span-2 flex justify-end gap-2">
                <div className="h-8 w-16 rounded-lg bg-muted/60" />
                <div className="h-8 w-20 rounded-lg bg-cyan-600/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
