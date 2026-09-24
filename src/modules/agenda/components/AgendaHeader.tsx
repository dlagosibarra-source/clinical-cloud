"use client";

import * as React from "react";
import type { AgendaDentist, AgendaLocation, AgendaViewMode } from "../types";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Stethoscope,
  Filter,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { getClinicTodayDateStr, shiftDateStr } from "@/shared/utils/date-time";

interface AgendaHeaderProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  locations: AgendaLocation[];
  selectedLocationId: string;
  onLocationChange: (locationId: string) => void;
  dentists: AgendaDentist[];
  selectedDentistIds: string[];
  onToggleDentist: (dentistId: string) => void;
  onSelectAllDentists: () => void;
  viewMode: AgendaViewMode;
  onViewModeChange: (mode: AgendaViewMode) => void;
  onNewAppointment?: () => void;
}

export function AgendaHeader({
  selectedDate,
  onDateChange,
  locations,
  selectedLocationId,
  onLocationChange,
  dentists,
  selectedDentistIds,
  onToggleDentist,
  onSelectAllDentists,
  viewMode,
  onViewModeChange,
  onNewAppointment,
}: AgendaHeaderProps) {
  // Format selected date nicely in Spanish
  const formattedDateTitle = React.useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    if (!year || !month || !day) return selectedDate;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  // Navigate dates cleanly without UTC midnight rollovers
  const handlePrevDay = () => {
    onDateChange(shiftDateStr(selectedDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(shiftDateStr(selectedDate, 1));
  };

  const handleToday = () => {
    onDateChange(getClinicTodayDateStr("America/Mazatlan"));
  };

  const isToday = React.useMemo(() => {
    return getClinicTodayDateStr("America/Mazatlan") === selectedDate;
  }, [selectedDate]);

  const allDentistsSelected = selectedDentistIds.length === 0 || selectedDentistIds.length === dentists.length;

  return (
    <div className="w-full space-y-4 mb-6">
      {/* 1. Main Header Row: Title + Date Navigation + CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Date Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground capitalize">
                {formattedDateTitle}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                Agenda clínica de turnos y disponibilidad en tiempo real
              </p>
            </div>
          </div>

          {/* Date controls: Hoy, <, >, datepicker */}
          <div className="flex items-center gap-1.5 ml-0 sm:ml-4 bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
            <Button
              variant={isToday ? "secondary" : "ghost"}
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs font-semibold px-2.5 rounded-lg"
            >
              Hoy
            </Button>

            <div className="h-4 w-px bg-border/80 mx-0.5" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevDay}
              className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Día anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextDay}
              className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Día siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>

            <div className="relative flex items-center ml-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="h-8 px-2 text-xs font-medium rounded-lg border border-border bg-muted/40 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Right side: View mode toggle + New Appointment button */}
        <div className="flex items-center gap-2.5 self-start lg:self-center">
          {/* Day / Week View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange("day")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                viewMode === "day"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("week")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                viewMode === "week"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semana
            </button>
          </div>

          {/* New Appointment CTA */}
          {onNewAppointment ? (
            <Button
              onClick={onNewAppointment}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs gap-1.5"
            >
              <Plus className="size-4" />
              Nueva Cita
            </Button>
          ) : (
            <Link
              href="/citas/nueva"
              className="inline-flex items-center justify-center h-9 px-3.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs gap-1.5 transition-colors"
            >
              <Plus className="size-4" />
              Nueva Cita
            </Link>
          )}
        </div>
      </div>

      {/* 2. Secondary Filter Row: Location Selector + Dentist Multi-select Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
        {/* Dentist Multi-select Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
            <Stethoscope className="size-3.5 text-cyan-600" />
            Odontólogos:
          </span>

          <button
            type="button"
            onClick={onSelectAllDentists}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
              allDentistsSelected
                ? "bg-cyan-600 text-white border-cyan-600 shadow-2xs"
                : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
            )}
          >
            Todos ({dentists.length})
          </button>

          {dentists.map((dentist) => {
            const isSelected = selectedDentistIds.includes(dentist.dentistId);
            return (
              <button
                key={dentist.dentistId}
                type="button"
                onClick={() => onToggleDentist(dentist.dentistId)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                  isSelected
                    ? "bg-cyan-50 text-cyan-900 border-cyan-500/50 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-500/40 shadow-2xs"
                    : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                )}
              >
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: dentist.color || "#0891b2" }}
                />
                <span>{dentist.professionalName || `Dr. ${dentist.firstName}`}</span>
              </button>
            );
          })}
        </div>

        {/* Location Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MapPin className="size-3.5 text-cyan-600" />
            Sucursal:
          </span>
          <select
            value={selectedLocationId}
            onChange={(e) => onLocationChange(e.target.value)}
            className="h-8 px-2.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">Todas las sucursales</option>
            {locations.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
