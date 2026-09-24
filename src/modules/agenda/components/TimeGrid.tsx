"use client";

import * as React from "react";
import type { AgendaAppointment, AgendaDentist, AgendaViewMode } from "../types";
import { AppointmentBlock } from "./AppointmentBlock";
import { Clock, Plus, User } from "lucide-react";
import { cn } from "cn";
import {
  calculateAppointmentPosition,
  getAppointmentTimeParts,
} from "@/shared/utils/date-time";

interface TimeGridProps {
  dentists: AgendaDentist[];
  appointments: AgendaAppointment[];
  selectedDate: string; // YYYY-MM-DD
  viewMode: AgendaViewMode;
  timeZone?: string;
  onAppointmentClick: (appointment: AgendaAppointment) => void;
  onNewAppointmentClick?: (dentistId: string, time: string) => void;
}

const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00 (12 hours total: 08:00 - 20:00)
const HOUR_HEIGHT = 88; // pixels per hour
const GRID_TOP_OFFSET = 24; // Padding to ensure 08:00 AM label & line are cleanly visible below sticky header

export function TimeGrid({
  dentists,
  appointments,
  selectedDate,
  viewMode,
  timeZone = "America/Mexico_City",
  onAppointmentClick,
  onNewAppointmentClick,
}: TimeGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Generate hour marks: 08:00 to 20:00
  const hours = React.useMemo(() => {
    const list: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push(h);
    }
    return list;
  }, []);

  // Current time indicator calculation in branch timezone
  const [currentMinutes, setCurrentMinutes] = React.useState<number | null>(null);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const parts = getAppointmentTimeParts(now, timeZone);
      if (parts.dateStr === selectedDate) {
        const mins = parts.hours * 60 + parts.minutes;
        if (mins >= START_HOUR * 60 && mins <= END_HOUR * 60) {
          setCurrentMinutes(mins);
          return;
        }
      }
      setCurrentMinutes(null);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [selectedDate, timeZone]);

  // Compute top offset for current time line
  const currentTimeTop = React.useMemo(() => {
    if (currentMinutes === null) return null;
    return GRID_TOP_OFFSET + ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }, [currentMinutes]);

  // Filter appointments for the selected date respecting branch timezone
  const filteredAppointments = React.useMemo(() => {
    return appointments.filter((apt) => {
      const effectiveTz = apt.location?.timezone || timeZone;
      const parts = getAppointmentTimeParts(apt.startAt, effectiveTz);
      return parts.dateStr === selectedDate;
    });
  }, [appointments, selectedDate, timeZone]);

  // Group appointments by dentistId
  const appointmentsByDentist = React.useMemo(() => {
    const map = new Map<string, AgendaAppointment[]>();
    for (const d of dentists) {
      map.set(d.dentistId, []);
    }
    for (const apt of filteredAppointments) {
      const list = map.get(apt.dentistId) || [];
      list.push(apt);
      map.set(apt.dentistId, list);
    }
    return map;
  }, [dentists, filteredAppointments]);

  // Convert an appointment to top & height using timezone-aware calculation
  const getAppointmentPosition = (apt: AgendaAppointment) => {
    const effectiveTz = apt.location?.timezone || timeZone;
    const { top, height } = calculateAppointmentPosition(
      apt.startAt,
      apt.durationMinutes,
      START_HOUR,
      HOUR_HEIGHT,
      effectiveTz
    );
    return { top: top + GRID_TOP_OFFSET, height };
  };

  const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_TOP_OFFSET + 24;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full rounded-2xl border border-border bg-card shadow-xs select-none max-h-[calc(100vh-210px)] min-h-[620px] overflow-y-auto overflow-x-auto"
    >
      {/* 1. Header with Doctor Lanes */}
      <div className="flex border-b border-border/80 bg-card/95 sticky top-0 z-30 backdrop-blur-md min-w-full w-max sm:w-full">
        {/* Time column header spacer */}
        <div className="w-16 sm:w-20 shrink-0 border-r border-border/60 p-3 text-center sticky left-0 z-40 bg-card/95 backdrop-blur-md">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
            <Clock className="size-3" />
            Hora
          </span>
        </div>

        {/* Doctor Column Headers */}
        <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-border/60 min-w-0">
          {dentists.map((dentist) => {
            const docApts = appointmentsByDentist.get(dentist.dentistId) || [];
            const activeCount = docApts.filter((a) => a.status !== "CANCELLED").length;

            return (
              <div
                key={dentist.dentistId}
                className="p-3 sm:px-4 flex items-center justify-between min-w-[200px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {dentist.avatarUrl ? (
                    <img
                      src={dentist.avatarUrl}
                      alt={dentist.firstName}
                      className="size-8 rounded-full object-cover border border-border shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-600/10 text-cyan-600 font-bold text-xs border border-cyan-500/20">
                      {dentist.firstName[0]}
                      {dentist.lastName[0]}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground truncate leading-tight">
                      {dentist.professionalName || `Dr. ${dentist.firstName} ${dentist.lastName}`}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {dentist.specialty || "Odontología"}
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center justify-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                  {activeCount} {activeCount === 1 ? "cita" : "citas"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Scrollable Body: Time rows & Doctor lanes */}
      <div className="relative flex min-w-full w-max sm:w-full">
        {/* Left Time Column */}
        <div
          className="w-16 sm:w-20 shrink-0 border-r border-border/60 relative bg-card/95 font-mono text-xs text-muted-foreground sticky left-0 z-20 backdrop-blur-md"
          style={{ height: `${totalGridHeight}px` }}
        >
          {hours.map((h, i) => {
            if (h === END_HOUR) return null; // Don't label the very bottom line
            const top = GRID_TOP_OFFSET + i * HOUR_HEIGHT;
            const timeLabel = `${h.toString().padStart(2, "0")}:00`;

            return (
              <div
                key={h}
                style={{ top: `${top}px` }}
                className="absolute inset-x-0 -translate-y-2.5 text-center text-[11px] font-medium"
              >
                <span>{timeLabel}</span>
              </div>
            );
          })}
        </div>

        {/* Lanes Grid Container */}
        <div
          className="relative flex-1 grid grid-flow-col auto-cols-fr divide-x divide-border/60 min-w-0"
          style={{ height: `${totalGridHeight}px` }}
        >
          {/* Horizontal Hour and Half-hour lines */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {hours.map((h, i) => {
              const top = GRID_TOP_OFFSET + i * HOUR_HEIGHT;
              const halfTop = top + HOUR_HEIGHT / 2;
              return (
                <React.Fragment key={h}>
                  {/* Hour line */}
                  <div
                    style={{ top: `${top}px` }}
                    className="absolute inset-x-0 border-t border-border/60"
                  />
                  {/* Half-hour subtle dashed line */}
                  {h < END_HOUR && (
                    <div
                      style={{ top: `${halfTop}px` }}
                      className="absolute inset-x-0 border-t border-dashed border-border/30"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current Time Horizontal Line */}
          {currentTimeTop !== null && (
            <div
              style={{ top: `${currentTimeTop}px` }}
              className="absolute inset-x-0 z-25 pointer-events-none flex items-center"
            >
              <div className="size-2.5 rounded-full bg-rose-500 shadow-sm -ml-1.5" />
              <div className="flex-1 h-0.5 bg-rose-500/80 shadow-xs" />
            </div>
          )}

          {/* Doctor Lanes */}
          {dentists.map((dentist) => {
            const docAppointments = appointmentsByDentist.get(dentist.dentistId) || [];

            return (
              <div
                key={dentist.dentistId}
                className="relative h-full min-w-[200px] transition-colors group"
                onDoubleClick={(e) => {
                  if (onNewAppointmentClick) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetY = e.clientY - rect.top - GRID_TOP_OFFSET;
                    const hoursOffset = Math.max(0, offsetY / HOUR_HEIGHT);
                    const hour = Math.floor(START_HOUR + hoursOffset);
                    const minutes = Math.floor((hoursOffset % 1) * 60) < 30 ? "00" : "30";
                    onNewAppointmentClick(dentist.dentistId, `${hour}:${minutes}`);
                  }
                }}
              >
                {/* Appointment Blocks */}
                {docAppointments.map((appointment) => {
                  const { top, height } = getAppointmentPosition(appointment);
                  return (
                    <AppointmentBlock
                      key={appointment.appointmentId}
                      appointment={appointment}
                      top={top}
                      height={height}
                      timeZone={appointment.location?.timezone || timeZone}
                      onClick={onAppointmentClick}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
