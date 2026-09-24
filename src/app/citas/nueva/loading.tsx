import * as React from "react";

export default function NuevaCitaLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-cyan-600/30" />
          <div className="space-y-1.5">
            <div className="h-7 w-64 rounded-md bg-muted/80" />
            <div className="h-4 w-96 rounded-md bg-muted/50" />
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 3 Steps (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Paso 1: Paciente */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="h-3 w-20 rounded bg-cyan-600/30" />
              <div className="h-3 w-28 rounded bg-muted/60" />
            </div>
            <div className="h-10 w-full rounded-xl bg-muted/60 border border-border" />
          </div>

          {/* Paso 2: Sucursal, Odontólogo y Servicio */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="h-3 w-20 rounded bg-cyan-600/30" />
              <div className="h-3 w-36 rounded bg-muted/60" />
            </div>

            {/* Sucursales */}
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/70" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="h-16 rounded-xl bg-muted/60 border border-border" />
                <div className="h-16 rounded-xl bg-muted/60 border border-border" />
              </div>
            </div>

            {/* Odontólogos */}
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/70" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="h-16 rounded-xl bg-muted/60 border border-border" />
                <div className="h-16 rounded-xl bg-muted/60 border border-border" />
                <div className="h-16 rounded-xl bg-muted/60 border border-border" />
              </div>
            </div>

            {/* Servicios */}
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/70" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="h-20 rounded-xl bg-muted/60 border border-border" />
                <div className="h-20 rounded-xl bg-muted/60 border border-border" />
              </div>
            </div>
          </div>

          {/* Paso 3: Fecha y Turnos */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="h-3 w-20 rounded bg-cyan-600/30" />
              <div className="h-3 w-28 rounded bg-muted/60" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 h-64 rounded-xl bg-muted/60 border border-border" />
              <div className="md:col-span-6 grid grid-cols-2 gap-2 content-start">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-11 rounded-lg bg-muted/50 border border-border" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Summary Card (4 cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-md space-y-5">
            <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 opacity-50" />
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 rounded bg-muted/80" />
              <div className="h-5 w-24 rounded-full bg-muted/60" />
            </div>

            <div className="space-y-3">
              <div className="h-14 rounded-lg bg-muted/40 border border-border/60" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-14 rounded-lg bg-muted/40 border border-border/60" />
                <div className="h-14 rounded-lg bg-muted/40 border border-border/60" />
              </div>
              <div className="h-14 rounded-lg bg-muted/40 border border-border/60" />
              <div className="h-28 rounded-xl bg-muted/50 border border-border/80" />
            </div>

            <div className="h-11 w-full rounded-xl bg-cyan-600/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
