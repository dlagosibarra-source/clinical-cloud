"use client";

import * as React from "react";
import type { PatientProfileData, PatientHistoryItem } from "../types";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { EditPatientDialog } from "./EditPatientDialog";
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Clock,
  Edit,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
  Stethoscope,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "@/shared/utils/date-time";

interface PatientProfileProps {
  initialPatient: PatientProfileData;
}

export function PatientProfile({ initialPatient }: PatientProfileProps) {
  const [patient, setPatient] = React.useState<PatientProfileData>(initialPatient);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Calculate age if dateOfBirth is present
  const calculatedAge = React.useMemo(() => {
    if (!patient.dateOfBirth) return null;
    const [year, month, day] = patient.dateOfBirth.split("-").map(Number);
    if (!year || !month || !day) return null;
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [patient.dateOfBirth]);

  const handlePatientUpdated = (updatedFields: Partial<PatientProfileData>) => {
    setPatient((prev) => ({
      ...prev,
      ...updatedFields,
    }));
  };

  const formatDate = (isoString: string) => {
    return formatAppointmentDate(isoString);
  };

  const formatTime = (isoString: string) => {
    return formatAppointmentTime(isoString);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Back navigation and Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pacientes"
            title="Volver al directorio"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground border border-border/60 inline-flex items-center justify-center"
            )}
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-600/10 text-cyan-700 dark:text-cyan-300 font-bold text-lg border border-cyan-500/20 shadow-2xs">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {patient.firstName} {patient.lastName}
                </h1>
                <Badge variant="clinical" className="text-[10px]">
                  Paciente
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Expediente: {patient.patientId}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Agendar nueva cita */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href={`/citas/nueva?patientId=${patient.patientId}`}
            className={cn(
              buttonVariants(),
              "h-10 px-4 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs gap-1.5 inline-flex items-center justify-center"
            )}
          >
            <CalendarPlus className="size-4" />
            Agendar Cita
          </Link>
        </div>
      </div>

      {/* 2. Responsive 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal Information Card + Metrics (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contact & Demographics Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3.5 text-cyan-600" />
                Datos Personales
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-7 px-2 text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 gap-1 rounded-lg"
              >
                <Edit className="size-3" />
                Editar
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Phone */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 text-cyan-600" />
                  Teléfono:
                </span>
                {patient.phone ? (
                  <a
                    href={`tel:${patient.phone}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {patient.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">No registrado</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-cyan-600" />
                  Correo:
                </span>
                {patient.email ? (
                  <a
                    href={`mailto:${patient.email}`}
                    className="font-semibold text-foreground hover:underline truncate max-w-[160px]"
                    title={patient.email}
                  >
                    {patient.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">No registrado</span>
                )}
              </div>

              {/* Date of Birth & Age */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-cyan-600" />
                  Nacimiento:
                </span>
                <span className="font-medium text-foreground">
                  {patient.dateOfBirth
                    ? `${patient.dateOfBirth} (${calculatedAge} años)`
                    : "No registrada"}
                </span>
              </div>

              {/* Gender */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Género:</span>
                <span className="font-medium text-foreground">
                  {patient.gender === "F"
                    ? "Femenino"
                    : patient.gender === "M"
                    ? "Masculino"
                    : patient.gender || "No especificado"}
                </span>
              </div>

              {/* WhatsApp Opt-in */}
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  WhatsApp:
                </span>
                <Badge
                  variant={patient.whatsappOptIn ? "success" : "outline"}
                  className="text-[10px]"
                >
                  {patient.whatsappOptIn ? "Autorizado" : "Sin autorizar"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="size-3.5 text-cyan-600" />
              Historial de Asistencia
            </span>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-muted/20 border border-border/60">
                <p className="text-lg font-bold text-foreground">
                  {patient.stats.totalAppointments}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                  Totales
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {patient.stats.completedAppointments}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                  Completadas
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/30">
                <p className="text-lg font-bold text-rose-700 dark:text-rose-400">
                  {patient.stats.cancelledAppointments}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                  Canceladas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Appointment History Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="size-4 text-cyan-600" />
                  Línea de Tiempo de Citas
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registro cronológico de tratamientos y consultas del paciente.
                </p>
              </div>

              <Badge variant="outline" className="text-xs font-semibold">
                {patient.history.length} {patient.history.length === 1 ? "registro" : "registros"}
              </Badge>
            </div>

            {/* Timeline List */}
            {patient.history.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
                {patient.history.map((item, index) => {
                  const isCompleted = item.status === "COMPLETED";
                  const isCancelled = item.status === "CANCELLED";
                  const isConfirmed = item.status === "CONFIRMED";

                  return (
                    <div key={item.appointmentId || index} className="relative group">
                      {/* Timeline Dot Node */}
                      <div
                        className={cn(
                          "absolute -left-6 top-1.5 size-5 rounded-full border-2 border-card flex items-center justify-center shadow-xs transition-transform group-hover:scale-110",
                          isCompleted && "bg-slate-500 text-white",
                          isConfirmed && "bg-emerald-500 text-white",
                          isCancelled && "bg-rose-500 text-white",
                          !isCompleted && !isCancelled && !isConfirmed && "bg-cyan-500 text-white"
                        )}
                      >
                        {isCompleted && <CheckCircle2 className="size-3" />}
                        {isCancelled && <XCircle className="size-3" />}
                        {isConfirmed && <CheckCircle2 className="size-3" />}
                        {!isCompleted && !isCancelled && !isConfirmed && (
                          <Calendar className="size-3" />
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2 hover:bg-muted/40 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {item.serviceName}
                            </span>
                            <Badge variant="clinical" className="text-[10px]">
                              {item.durationMinutes}m
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {isConfirmed && (
                              <Badge variant="success" className="text-xs">
                                Confirmada
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="secondary" className="text-xs">
                                Completada
                              </Badge>
                            )}
                            {isCancelled && (
                              <Badge variant="destructive" className="text-xs">
                                Cancelada
                              </Badge>
                            )}
                            {item.status === "SCHEDULED" && (
                              <Badge variant="clinical" className="text-xs">
                                Agendada
                              </Badge>
                            )}
                            {item.status === "NO_SHOW" && (
                              <Badge variant="outline" className="text-xs text-amber-700">
                                No asistió
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Doctor and Date details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="size-3.5 text-cyan-600 shrink-0" />
                            <span className="text-foreground/90 font-medium truncate">
                              {item.dentistName}
                            </span>
                            {item.dentistSpecialty && (
                              <span className="text-[11px] text-muted-foreground truncate">
                                • {item.dentistSpecialty}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 font-mono sm:justify-end">
                            <Clock className="size-3.5 text-cyan-600 shrink-0" />
                            <span className="capitalize">{formatDate(item.startAt)}</span>
                            <span>
                              {formatTime(item.startAt)} - {formatTime(item.endAt)} hrs
                            </span>
                          </div>
                        </div>

                        {/* Notes if present */}
                        {item.notes && (
                          <div className="pt-2 mt-2 border-t border-border/60 text-xs text-muted-foreground flex items-start gap-1.5 italic">
                            <FileText className="size-3 text-cyan-600 shrink-0 mt-0.5" />
                            <p>"{item.notes}"</p>
                          </div>
                        )}

                        {/* Value / Price */}
                        {item.serviceValue && (
                          <div className="flex items-center justify-end text-xs font-semibold text-cyan-700 dark:text-cyan-400 pt-1">
                            <span>
                              Monto: ${typeof item.serviceValue === "number" ? item.serviceValue.toFixed(2) : item.serviceValue} MXN
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground">
                  <Calendar className="size-6" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">
                  Sin citas en el historial
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Este paciente aún no registra consultas o procedimientos en la clínica.
                </p>
                <Link
                  href={`/citas/nueva?patientId=${patient.patientId}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "mt-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8 inline-flex items-center justify-center"
                  )}
                >
                  <CalendarPlus className="size-3.5 mr-1" />
                  Agendar Primera Cita
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        patient={patient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onPatientUpdated={handlePatientUpdated}
      />
    </div>
  );
}
