"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  User,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import type { BookingState } from "./types";

interface AppointmentSummaryCardProps {
  bookingState: BookingState;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
}

export function AppointmentSummaryCard({
  bookingState,
  onConfirm,
  isLoading = false,
  error = null,
  success = false,
}: AppointmentSummaryCardProps) {
  const { patient, location, dentist, service, date, slot } = bookingState;

  // Determine which fields are still required
  const missingSteps = React.useMemo(() => {
    const missing: string[] = [];
    if (!patient) missing.push("Paciente");
    if (!location) missing.push("Sucursal");
    if (!dentist) missing.push("Odontólogo");
    if (!service) missing.push("Servicio");
    if (!slot) missing.push("Horario");
    return missing;
  }, [patient, location, dentist, service, slot]);

  const isReady = missingSteps.length === 0;

  // Calculate formatted date and time
  const formattedDate = React.useMemo(() => {
    if (!date) return null;
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return null;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [date]);

  const formattedPrice = service
    ? typeof service.price === "number"
      ? `$${service.price.toFixed(2)}`
      : `$${parseFloat(service.price || "0").toFixed(2)}`
    : "$0.00";

  return (
    <Card className="sticky top-6 border-border/80 shadow-md backdrop-blur-xs overflow-hidden">
      {/* Header with clinical accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600" />

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="size-4 text-cyan-600 dark:text-cyan-400" />
            Resumen de la Cita
          </CardTitle>
          <Badge
            variant={isReady ? "success" : "outline"}
            className="text-[11px] font-medium"
          >
            {isReady ? "Listo para confirmar" : "En configuración"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {/* Patient preview */}
        <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3 bg-muted/20">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
            <User className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Paciente
            </p>
            {patient ? (
              <div>
                <p className="font-semibold text-foreground truncate">
                  {patient.firstName} {patient.lastName}
                </p>
                {patient.phone && (
                  <p className="text-xs text-muted-foreground">{patient.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin seleccionar</p>
            )}
          </div>
        </div>

        {/* Location & Dentist preview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 p-2.5 bg-muted/20">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
              <MapPin className="size-3 text-cyan-600" />
              Sucursal
            </p>
            <p className="font-medium text-xs text-foreground truncate">
              {location?.name || "Sin seleccionar"}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 p-2.5 bg-muted/20">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
              <Stethoscope className="size-3 text-cyan-600" />
              Odontólogo
            </p>
            <p className="font-medium text-xs text-foreground truncate">
              {dentist
                ? dentist.professionalName || `Dr. ${dentist.firstName}`
                : "Sin seleccionar"}
            </p>
          </div>
        </div>

        {/* Date & Time Slot preview */}
        <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Calendar className="size-3.5 text-cyan-600" />
            Fecha y Hora
          </p>
          {slot ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-foreground capitalize">
                  {formattedDate}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="size-3" />
                  {slot.time} hrs
                </p>
              </div>
              <Badge variant="clinical" className="text-[10px]">
                Confirmado
              </Badge>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {date ? `${date} (selecciona horario)` : "Selecciona fecha y hora"}
            </p>
          )}
        </div>

        {/* Service, duration and cost breakdown */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Desglose del Tratamiento
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Servicio:</span>
            <span className="font-medium text-foreground text-right truncate max-w-[170px]">
              {service?.name || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Duración estimada:</span>
            <span className="font-medium text-foreground">
              {service ? `${service.durationMinutes} minutos` : "—"}
            </span>
          </div>
          <div className="border-t border-border/80 pt-2.5 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-foreground">
              Total a Pagar:
            </span>
            <div className="text-right">
              <span className="text-lg font-bold text-cyan-700 dark:text-cyan-400">
                {formattedPrice}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                {service?.currency || "MXN"}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <p className="font-medium">¡Cita agendada exitosamente!</p>
          </div>
        )}

        {/* Missing fields helper */}
        {!isReady && (
          <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/80">Por completar: </span>
            {missingSteps.join(", ")}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-6 flex flex-col gap-2">
        <Button
          type="button"
          onClick={onConfirm}
          disabled={!isReady || isLoading}
          className="w-full h-11 text-sm font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-all active:scale-[0.99] gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Confirmando Cita...
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" />
              Confirmar Cita
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">
          Protección de concurrencia y validación de disponibilidad activa.
        </p>
      </CardFooter>
    </Card>
  );
}
