"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, Sun, Moon } from "lucide-react";
import type { TimeSlot } from "./types";
import { cn } from "cn";

interface DateTimeSlotPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoadingSlots?: boolean;
}

export function DateTimeSlotPicker({
  selectedDate,
  onSelectDate,
  slots,
  selectedSlot,
  onSelectSlot,
  isLoadingSlots = false,
}: DateTimeSlotPickerProps) {
  // Generate 7 upcoming days for the quick date strip
  const dateStrip = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("es-ES", { weekday: "short" });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString("es-ES", { month: "short" });
      days.push({
        isoDate: isoDate!,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1, 3),
        dayNum,
        monthName,
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  // Split slots into morning and afternoon
  const morningSlots = React.useMemo(
    () => slots.filter((s) => s.period === "morning"),
    [slots]
  );
  const afternoonSlots = React.useMemo(
    () => slots.filter((s) => s.period === "afternoon"),
    [slots]
  );

  return (
    <div className="space-y-6">
      {/* Selector de Fecha: Quick Date Strip + Date Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarIcon className="size-4 text-cyan-600 dark:text-cyan-400" />
            Fecha de Consulta
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => onSelectDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Horizontal 7-Day Carousel Strip */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {dateStrip.map((d) => {
            const isSelected = selectedDate === d.isoDate;
            return (
              <button
                key={d.isoDate}
                type="button"
                onClick={() => onSelectDate(d.isoDate)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/50",
                  isSelected
                    ? "border-cyan-600 bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-600/30 scale-[1.02]"
                    : "border-border bg-card text-foreground hover:border-muted-foreground/30 hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wider",
                    isSelected ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {d.dayName}
                </span>
                <span className="text-base font-bold my-0.5">{d.dayNum}</span>
                <span
                  className={cn(
                    "text-[10px]",
                    isSelected ? "text-white/80" : "text-muted-foreground/80"
                  )}
                >
                  {d.isToday ? "Hoy" : d.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parrilla de Slots Horarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-cyan-600 dark:text-cyan-400" />
            Horarios Disponibles
          </label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-cyan-500" /> Disponible
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-muted-foreground/40" /> Ocupado
            </span>
          </div>
        </div>

        {isLoadingSlots ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent mb-2" />
            <p className="text-xs">Calculando horarios con el doctor...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/20">
            <Clock className="size-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">
              No hay horarios disponibles para esta fecha
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Intenta seleccionando otro día o cambiando el odontólogo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mañana */}
            {morningSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sun className="size-3.5 text-amber-500" />
                  <span>Mañana</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {morningSlots.map((slot) => {
                    const isSelected =
                      selectedSlot?.startAt === slot.startAt;
                    return (
                      <button
                        key={slot.startAt}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => onSelectSlot(slot)}
                        className={cn(
                          "flex items-center justify-center rounded-lg border py-2.5 px-2 text-xs font-semibold transition-all duration-150 select-none",
                          !slot.available &&
                            "border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed line-through",
                          slot.available &&
                            !isSelected &&
                            "border-border bg-card text-foreground hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 active:scale-95 shadow-2xs",
                          isSelected &&
                            "border-cyan-600 bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-500/30 scale-105"
                        )}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tarde */}
            {afternoonSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Moon className="size-3.5 text-indigo-400" />
                  <span>Tarde</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {afternoonSlots.map((slot) => {
                    const isSelected =
                      selectedSlot?.startAt === slot.startAt;
                    return (
                      <button
                        key={slot.startAt}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => onSelectSlot(slot)}
                        className={cn(
                          "flex items-center justify-center rounded-lg border py-2.5 px-2 text-xs font-semibold transition-all duration-150 select-none",
                          !slot.available &&
                            "border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed line-through",
                          slot.available &&
                            !isSelected &&
                            "border-border bg-card text-foreground hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 active:scale-95 shadow-2xs",
                          isSelected &&
                            "border-cyan-600 bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-500/30 scale-105"
                        )}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
