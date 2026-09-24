"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { createServiceAction, updateServiceAction } from "../actions/service.actions";
import { Loader2, Sparkles, Clock, DollarSign, Tag, FileText, TrendingUp, Stethoscope } from "lucide-react";
import { cn } from "cn";
import type { services } from "../types/schema";

export type ServiceRecord = typeof services.$inferSelect;

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceRecord | null;
  onSaved: (service: ServiceRecord) => void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  service,
  onSaved,
}: ServiceDialogProps) {
  const isEditing = Boolean(service);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState("45");
  const [price, setPrice] = React.useState("800");
  const [isVariablePrice, setIsVariablePrice] = React.useState(false);
  const [requiresAssessment, setRequiresAssessment] = React.useState(false);
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || "");
      setDurationMinutes(String(service.durationMinutes));
      setPrice(String(service.price));
      setIsVariablePrice(Boolean(service.isVariablePrice));
      setRequiresAssessment(Boolean(service.requiresAssessment));
      setStatus(service.status as "ACTIVE" | "INACTIVE");
    } else {
      setName("");
      setDescription("");
      setDurationMinutes("45");
      setPrice("800");
      setIsVariablePrice(false);
      setRequiresAssessment(false);
      setStatus("ACTIVE");
    }
    setError(null);
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del tratamiento es obligatorio.");
      return;
    }

    const dur = parseInt(durationMinutes, 10);
    if (isNaN(dur) || dur <= 0) {
      setError("La duración debe ser un número entero mayor a 0 minutos.");
      return;
    }

    const pr = parseFloat(price);
    if (isNaN(pr) || pr < 0) {
      setError("El precio debe ser un número mayor o igual a 0.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && service) {
        const res = await updateServiceAction(service.serviceId, {
          name: name.trim(),
          description: description.trim() || null,
          durationMinutes: dur,
          price: pr,
          isVariablePrice,
          requiresAssessment,
          status,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || "No se pudo actualizar el servicio");
        }

        onSaved(res.data as ServiceRecord);
      } else {
        const res = await createServiceAction({
          name: name.trim(),
          description: description.trim() || null,
          durationMinutes: dur,
          price: pr,
          currency: "MXN",
          isVariablePrice,
          requiresAssessment,
          status,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || "No se pudo registrar el servicio");
        }

        onSaved(res.data as ServiceRecord);
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-primary pb-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600 border border-cyan-500/20">
                <Sparkles className="size-5" />
              </div>
              <div>
                <DialogTitle>
                  {isEditing ? "Editar Servicio / Tratamiento" : "Nuevo Servicio / Tratamiento"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Actualiza la tarifa, duración y descripción del tratamiento."
                    : "Configura un nuevo tratamiento dental disponible para cotizaciones y agenda."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Nombre del Servicio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="size-3.5 text-cyan-600" />
                Nombre del Tratamiento <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej. Limpieza Profunda y Profilaxis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Duración y Precio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-cyan-600" />
                  Duración (minutos) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  placeholder="Ej. 45"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-emerald-600" />
                  Precio (MXN) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Ej. 800"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Descripción clínica */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                Descripción o Notas Clínicas
              </label>
              <textarea
                placeholder="Describe qué incluye el tratamiento y si requiere valoración diagnóstica previa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none"
              />
            </div>

            {/* Toggles Inteligentes de IA */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-cyan-600" />
                <label className="text-xs font-semibold text-foreground">
                  Toggles Inteligentes (Comportamiento de la IA)
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Toggle 1: Precio Variable */}
                <div
                  onClick={() => setIsVariablePrice((prev) => !prev)}
                  className={cn(
                    "flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                    isVariablePrice
                      ? "border-cyan-500/40 bg-cyan-500/5 shadow-2xs"
                      : "border-border/80 bg-card/60 hover:border-border"
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <TrendingUp className="size-3.5 text-cyan-600 shrink-0" />
                      <span>Precio Variable</span>
                      {isVariablePrice && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                          &quot;Desde $X&quot;
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Indica a la IA que el costo final depende del paciente. Se mostrará como &quot;Desde $X&quot;.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isVariablePrice}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none mt-0.5",
                      isVariablePrice ? "bg-cyan-600" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-xs ring-0 transition-transform",
                        isVariablePrice ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Toggle 2: Requiere Valoración Previa */}
                <div
                  onClick={() => setRequiresAssessment((prev) => !prev)}
                  className={cn(
                    "flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                    requiresAssessment
                      ? "border-amber-500/40 bg-amber-500/5 shadow-2xs"
                      : "border-border/80 bg-card/60 hover:border-border"
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Stethoscope className="size-3.5 text-amber-600 shrink-0" />
                      <span>Requiere Valoración Previa</span>
                      {requiresAssessment && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          Diagnóstico 1°
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      La IA no agendará este tratamiento directamente, ofrecerá una cita de diagnóstico primero.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={requiresAssessment}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none mt-0.5",
                      requiresAssessment ? "bg-amber-600" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-xs ring-0 transition-transform",
                        requiresAssessment ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Estado en Tarifario
              </label>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="ACTIVE"
                    checked={status === "ACTIVE"}
                    onChange={() => setStatus("ACTIVE")}
                    className="size-4 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Activo (Visible en cotizaciones y agenda)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="INACTIVE"
                    checked={status === "INACTIVE"}
                    onChange={() => setStatus("INACTIVE")}
                    className="size-4 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Inactivo</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                "Actualizar Tratamiento"
              ) : (
                "Crear Tratamiento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
