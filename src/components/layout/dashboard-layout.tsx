"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  Users,
  Menu,
  X,
  Stethoscope,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "cn";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    title: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
    description: "Turnos diarios y semanales",
  },
  {
    title: "Nueva Cita",
    href: "/citas/nueva",
    icon: CalendarPlus,
    description: "Flujo de agendamiento clínico",
  },
  {
    title: "Pacientes",
    href: "/pacientes",
    icon: Users,
    description: "Directorio y perfiles clínicos",
  },
  {
    title: "Servicios",
    href: "/servicios",
    icon: Sparkles,
    description: "Catálogo y tarifario de tratamientos",
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-40">
        <Link href="/agenda" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
            <Stethoscope className="size-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Clinical Cloud
            </span>
          </div>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="size-9 p-0 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop + Mobile slide-over) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <Link href="/agenda" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-700 to-cyan-500 text-white shadow-xs">
              <Stethoscope className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  Clinical Cloud
                </span>
                <Badge variant="clinical" className="text-[9px] px-1 py-0 h-3.5">
                  MVP
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                Clínica Dental Demo
              </p>
            </div>
          </Link>

          {/* Close on mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
            Operaciones
          </p>

          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                  isActive
                    ? "bg-cyan-50/80 text-cyan-950 font-semibold dark:bg-cyan-950/40 dark:text-cyan-100 shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-cyan-600 text-white shadow-2xs"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span>{item.title}</span>
                </div>

                {isActive && (
                  <div className="size-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
                )}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-border/60">
            <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
              Próximos Módulos
            </p>

            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground/60 cursor-not-allowed">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground/50">
                  <Activity className="size-4" />
                </div>
                <span>Odontograma</span>
              </div>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 text-muted-foreground/50">
                Pronto
              </Badge>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Clinic Status & User Card */}
        <div className="p-3 border-t border-border/70 space-y-3 bg-muted/20">
          {/* Active Clinic Badge */}
          <div className="rounded-xl border border-border/60 p-2.5 bg-card/60 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Sucursal Activa
              </p>
              <p className="text-xs font-semibold text-foreground truncate">
                Polanco Central
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                Online
              </span>
            </div>
          </div>

          {/* User Profile snippet */}
          <div className="flex items-center gap-2.5 px-1 py-0.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-600/10 text-cyan-700 dark:text-cyan-300 font-bold text-xs border border-cyan-500/20">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                Admin Demo
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                owner@demo.clinicalcloud.dev
              </p>
            </div>
            <Badge variant="clinical" className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold tracking-wider shrink-0">
              OWNER
            </Badge>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
