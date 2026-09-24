"use client";

import * as React from "react";
import type { AgendaAppointment, AppointmentStatus } from "../types";
import { Badge } from "../../../components/ui/badge";
import { Clock, User, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { cn } from "cn";
import { formatAppointmentTime } from "@/shared/utils/date-time";

interface AppointmentBlockProps {
  appointment: AgendaAppointment;
  top: number;
  height: number;
  timeZone?: string;
  onClick: (appointment: AgendaAppointment) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline" | "clinical" | "success";
    borderClass: string;
    bgClass: string;
    textClass: string;
    indicatorColor: string;
    icon: React.ElementType;
  }
> = {
  CONFIRMED: {
    label: "Confirmada",
    badgeVariant: "success",
    borderClass: "border-emerald-500/40 hover:border-emerald-500 dark:border-emerald-500/30",
    bgClass: "bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40",
    textClass: "text-emerald-900 dark:text-emerald-200",
    indicatorColor: "bg-emerald-500",
    icon: CheckCircle2,
  },
  SCHEDULED: {
    label: "Agendada",
    badgeVariant: "clinical",
    borderClass: "border-cyan-500/40 hover:border-cyan-500 dark:border-cyan-500/30",
    bgClass: "bg-cyan-50/80 hover:bg-cyan-50 dark:bg-cyan-950/25 dark:hover:bg-cyan-950/40",
    textClass: "text-cyan-900 dark:text-cyan-200",
    indicatorColor: "bg-cyan-500",
    icon: Calendar,
  },
  COMPLETED: {
    label: "Completada",
    badgeVariant: "secondary",
    borderClass: "border-slate-300 hover:border-slate-400 dark:border-slate-700",
    bgClass: "bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-900/30 dark:hover:bg-slate-900/50",
    textClass: "text-slate-800 dark:text-slate-200",
    indicatorColor: "bg-slate-400",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelada",
    badgeVariant: "destructive",
    borderClass: "border-rose-300/60 hover:border-rose-400 dark:border-rose-900/40",
    bgClass: "bg-rose-50/60 hover:bg-rose-50/90 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 opacity-75",
    textClass: "text-rose-900 dark:text-rose-300 line-through",
    indicatorColor: "bg-rose-500",
    icon: XCircle,
  },
  NO_SHOW: {
    label: "No asistió",
    badgeVariant: "outline",
    borderClass: "border-amber-400/50 hover:border-amber-500 dark:border-amber-600/40",
    bgClass: "bg-amber-50/70 hover:bg-amber-50/95 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
    textClass: "text-amber-900 dark:text-amber-200",
    indicatorColor: "bg-amber-500",
    icon: AlertCircle,
  },
  RESCHEDULED: {
    label: "Reagendada",
    badgeVariant: "outline",
    borderClass: "border-purple-300 hover:border-purple-400 dark:border-purple-800",
    bgClass: "bg-purple-50/70 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
    textClass: "text-purple-900 dark:text-purple-200",
    indicatorColor: "bg-purple-500",
    icon: Clock,
  },
};

export function AppointmentBlock({
  appointment,
  top,
  height,
  timeZone,
  onClick,
  className,
}: AppointmentBlockProps) {
  const config = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.SCHEDULED;
  const isShortDuration = appointment.durationMinutes <= 30;

  const isEmergency = React.useMemo(() => {
    const notesUpper = appointment.notes?.toUpperCase() || "";
    const serviceUpper = appointment.service?.name?.toUpperCase() || "";
    return notesUpper.includes("URGENCIA") || serviceUpper.includes("URGENCIA");
  }, [appointment.notes, appointment.service?.name]);

  const effectiveTz = timeZone || appointment.location?.timezone || "America/Mexico_City";
  const startTimeStr = formatAppointmentTime(appointment.startAt, effectiveTz);
  const endTimeStr = formatAppointmentTime(appointment.endAt, effectiveTz);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(appointment)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(appointment);
        }
      }}
      style={{
        top: `${top}px`,
        height: `${Math.max(height - 4, 28)}px`, // 4px margin gap
      }}
      className={cn(
        "absolute inset-x-1.5 z-10 cursor-pointer overflow-hidden rounded-xl border p-2.5 shadow-xs transition-all duration-150 select-none",
        "focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1",
        "hover:shadow-md hover:scale-[1.008] hover:z-20",
        isEmergency
          ? "border-rose-500/80 bg-rose-50/90 dark:bg-rose-950/40 ring-1 ring-rose-500/50"
          : config.borderClass,
        isEmergency ? "" : config.bgClass,
        className
      )}
      title={`${appointment.patient.firstName} ${appointment.patient.lastName} - ${appointment.service.name} (${startTimeStr} - ${endTimeStr})`}
    >
      {/* Left colored indicator strip */}
      <div
        className={cn(
          "absolute left-0 inset-y-0 w-1.5 rounded-l-xl",
          isEmergency ? "bg-rose-600 animate-pulse" : config.indicatorColor
        )}
      />

      <div className="pl-1 flex flex-col justify-between h-full min-w-0">
        {/* Top row: Patient name + Status Badge / Time */}
        <div className="flex items-start justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isEmergency && (
              <Badge
                variant="destructive"
                className="text-[9px] px-1 py-0 h-4 uppercase font-black tracking-wider bg-rose-600 text-white animate-pulse shadow-xs flex items-center gap-0.5 shrink-0"
              >
                <AlertCircle className="size-2.5" />
                Urgencia
              </Badge>
            )}
            <span
              className={cn(
                "font-semibold text-xs truncate tracking-tight",
                isEmergency ? "text-rose-950 dark:text-rose-100 font-bold" : config.textClass
              )}
            >
              {appointment.patient.firstName} {appointment.patient.lastName}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isShortDuration && (
              <Badge
                variant={config.badgeVariant}
                className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold tracking-wider"
              >
                {config.label}
              </Badge>
            )}
            <span className="text-[10px] font-mono font-medium text-muted-foreground whitespace-nowrap">
              {startTimeStr}
            </span>
          </div>
        </div>

        {/* Middle/Bottom: Service Name & Time span */}
        {!isShortDuration && (
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground mt-0.5 truncate">
            <span className="truncate font-normal text-foreground/80">
              {appointment.service.name}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0">
              {appointment.durationMinutes}m
            </span>
          </div>
        )}

        {/* Minimal display for very short slots */}
        {isShortDuration && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {appointment.service.name}
          </p>
        )}
      </div>
    </div>
  );
}
