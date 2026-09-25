import * as React from "react";
import Link from "next/link";
import { Stethoscope, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-cyan-950/20 dark:to-slate-900 text-foreground selection:bg-cyan-500/20">
      {/* Decorative ambient background accents */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[360px] bg-gradient-to-tr from-cyan-400/15 via-teal-300/10 to-transparent blur-3xl rounded-full"
        aria-hidden="true"
      />

      {/* Auth Header */}
      <header className="relative z-10 w-full px-6 py-6 sm:py-8 flex justify-center">
        <Link
          href="/login"
          className="group inline-flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-700 to-cyan-500 text-white shadow-md shadow-cyan-600/20 ring-1 ring-white/20 transition-transform group-hover:scale-105">
            <Stethoscope className="size-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-foreground">
                Clinical Cloud
              </span>
              <Badge variant="clinical" className="text-[10px] px-1.5 py-0 h-4">
                SaaS Dental
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Agenda clínica y gestión odontológica
            </p>
          </div>
        </Link>
      </header>

      {/* Main Centered Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-4 sm:px-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
          {children}
        </div>
      </main>

      {/* Auth Footer */}
      <footer className="relative z-10 w-full px-6 py-6 text-center text-xs text-muted-foreground border-t border-border/40 bg-background/30 backdrop-blur-xs">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground/80">
            <ShieldCheck className="size-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Acceso seguro &middot; Cumplimiento clínico</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Clinical Cloud</p>
        </div>
      </footer>
    </div>
  );
}
