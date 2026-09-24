"use client";

import * as React from "react";
import type { AgendaAppointment, AppointmentStatus } from "../types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../../../components/ui/sheet";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { cn } from "cn";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "@/shared/utils/date-time";

interface AppointmentDetailsPanelProps {
  appointment: AgendaAppointment | null;
  isOpen: boolean;
  timeZone?: string;
  onClose: () => void;
  onUpdateStatus?: (appointmentId: string, newStatus: AppointmentStatus) => void;
}

export function AppointmentDetailsPanel({
  appointment,
  isOpen,
  timeZone,
  onClose,
  onUpdateStatus,
}: AppointmentDetailsPanelProps) {
  const [confirmCancelOpen, setConfirmCancelOpen] = React.useState(false);

  if (!appointment) return null;

  const effectiveTz = timeZone || appointment.location?.timezone || "America/Mexico_City";
  const formattedDate = formatAppointmentDate(appointment.startAt, effectiveTz);
  const startTimeStr = formatAppointmentTime(appointment.startAt, effectiveTz);
  const endTimeStr = formatAppointmentTime(appointment.endAt, effectiveTz);

  const formattedPrice =
    typeof appointment.service.price === "number"
      ? `$${appointment.service.price.toFixed(2)}`
      : `$${parseFloat(appointment.service.price || "0").toFixed(2)}`;

  const handleCancel = () => {
    if (onUpdateStatus) {
      onUpdateStatus(appointment.appointmentId, "CANCELLED");
    }
    setConfirmCancelOpen(false);
    onClose();
  };

  const handleComplete = () => {
    if (onUpdateStatus) {
      onUpdateStatus(appointment.appointmentId, "COMPLETED");
    }
    onClose();
  };

  const handleConfirm = () => {
    if (onUpdateStatus) {
      onUpdateStatus(appointment.appointmentId, "CONFIRMED");
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {/* Header accent strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 shrink-0" />

        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase"
            >
              ID: {appointment.appointmentId}
            </Badge>

            {appointment.status === "CONFIRMED" && (
              <Badge variant="success" className="text-xs gap-1">
                <CheckCircle2 className="size-3" />
                Confirmada
              </Badge>
            )}
            {appointment.status === "SCHEDULED" && (
              <Badge variant="clinical" className="text-xs gap-1">
                <Calendar className="size-3" />
                Agendada
              </Badge>
            )}
            {appointment.status === "COMPLETED" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="size-3" />
                Completada
              </Badge>
            )}
            {appointment.status === "CANCELLED" && (
              <Badge variant="destructive" className="text-xs gap-1">
                <XCircle className="size-3" />
                Cancelada
              </Badge>
            )}
            {appointment.status === "NO_SHOW" && (
              <Badge variant="outline" className="text-xs gap-1 text-amber-700 dark:text-amber-300 border-amber-400">
                <AlertTriangle className="size-3" />
                No asistió
              </Badge>
            )}
            {(appointment.notes?.toUpperCase().includes("URGENCIA") ||
              appointment.service.name.toUpperCase().includes("URGENCIA")) && (
              <Badge variant="destructive" className="text-xs gap-1 bg-rose-600 text-white animate-pulse">
                <AlertCircle className="size-3" />
                🚨 Urgencia Clínica
              </Badge>
            )}
          </div>

          <SheetTitle className="text-xl font-bold mt-2">
            Detalle de la Cita
          </SheetTitle>
          <SheetDescription>
            Información operacional del paciente, tratamiento y asignación médica.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4 space-y-5 flex-1">
          {/* Patient Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-600/10 text-cyan-700 dark:text-cyan-400">
                <User className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Paciente
                </p>
                <h4 className="font-bold text-sm text-foreground truncate">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/60 text-xs">
              {appointment.patient.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5 text-cyan-600" />
                    Teléfono:
                  </span>
                  <a
                    href={`tel:${appointment.patient.phone}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {appointment.patient.phone}
                  </a>
                </div>
              )}

              {appointment.patient.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-cyan-600" />
                    Correo:
                  </span>
                  <a
                    href={`mailto:${appointment.patient.email}`}
                    className="font-medium text-foreground hover:underline truncate max-w-[190px]"
                  >
                    {appointment.patient.email}
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  WhatsApp:
                </span>
                <Badge
                  variant={appointment.patient.whatsappOptIn ? "success" : "outline"}
                  className="text-[10px]"
                >
                  {appointment.patient.whatsappOptIn ? "Opt-In Activo" : "Sin autorizar"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Date, Time & Location Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
                <Calendar className="size-4 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Fecha y Horario
                </p>
                <p className="font-semibold text-foreground capitalize mt-0.5">
                  {formattedDate}
                </p>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                  <Clock className="size-3.5 text-cyan-600" />
                  {startTimeStr} - {endTimeStr} hrs ({appointment.durationMinutes} min)
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-start gap-3 text-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
                <MapPin className="size-4 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Sucursal
                </p>
                <p className="font-semibold text-foreground">
                  {appointment.location.name}
                </p>
                {appointment.location.address && (
                  <p className="text-muted-foreground text-[11px] truncate">
                    {appointment.location.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dentist Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600">
                <Stethoscope className="size-4" />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Odontólogo Asignado
                </p>
                <p className="font-semibold text-foreground text-sm">
                  {appointment.dentist.professionalName ||
                    `Dr. ${appointment.dentist.firstName} ${appointment.dentist.lastName}`}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {appointment.dentist.specialty || "Odontología General"}
                </p>
              </div>
            </div>
          </div>

          {/* Service & Price Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-cyan-600" />
                Desglose del Tratamiento
              </p>
              <Badge variant="clinical" className="text-[10px]">
                {appointment.durationMinutes} min
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-medium text-foreground">
                {appointment.service.name}
              </span>
            </div>

            <div className="border-t border-border/80 pt-2.5 flex items-baseline justify-between">
              <span className="text-xs font-semibold text-foreground">
                Monto del Servicio:
              </span>
              <div className="text-right">
                <span className="text-lg font-bold text-cyan-700 dark:text-cyan-400">
                  {formattedPrice}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  {appointment.service.currency || "MXN"}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {appointment.notes && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1 text-xs">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <FileText className="size-3 text-cyan-600" />
                Notas de la Cita
              </p>
              <p className="text-foreground/90 italic leading-relaxed">
                "{appointment.notes}"
              </p>
            </div>
          )}

          {/* Confirmation Box for Cancellation */}
          {confirmCancelOpen && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-destructive">¿Confirmas la cancelación?</p>
                  <p className="text-muted-foreground mt-0.5">
                    El turno quedará disponible para el motor de recuperación automática de citas.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmCancelOpen(false)}
                  className="h-8 text-xs"
                >
                  Volver
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCancel}
                  className="h-8 text-xs"
                >
                  Sí, Cancelar Cita
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <SheetFooter className="gap-2">
          {appointment.status !== "CANCELLED" && !confirmCancelOpen && (
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmCancelOpen(true)}
                className="w-full sm:w-auto flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-xs h-10 font-semibold"
              >
                <XCircle className="size-4 mr-1.5" />
                Cancelar Cita
              </Button>

              {appointment.status === "SCHEDULED" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConfirm}
                  className="w-full sm:w-auto flex-1 text-emerald-700 border-emerald-500/40 hover:bg-emerald-50 text-xs h-10 font-semibold dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <CheckCircle2 className="size-4 mr-1.5" />
                  Confirmar
                </Button>
              )}

              {appointment.status !== "COMPLETED" && (
                <Button
                  type="button"
                  onClick={handleComplete}
                  className="w-full sm:w-auto flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-10 font-semibold"
                >
                  <CheckCircle2 className="size-4 mr-1.5" />
                  Completar
                </Button>
              )}
            </div>
          )}

          {appointment.status === "CANCELLED" && (
            <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
              <span className="italic">Esta cita fue cancelada.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs"
              >
                Cerrar
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
