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
import { updatePatientAction } from "../actions/patient.actions";
import { Loader2, User, Phone, Mail, Calendar, MessageSquare } from "lucide-react";
import type { PatientProfileData, PatientListItem } from "../types";

interface EditPatientDialogProps {
  patient: PatientProfileData | PatientListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: (updated: Partial<PatientListItem>) => void;
}

export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
  onPatientUpdated,
}: EditPatientDialogProps) {
  const [firstName, setFirstName] = React.useState(patient.firstName);
  const [lastName, setLastName] = React.useState(patient.lastName);
  const [phone, setPhone] = React.useState(patient.phone || "");
  const [email, setEmail] = React.useState(patient.email || "");
  const [dateOfBirth, setDateOfBirth] = React.useState(patient.dateOfBirth || "");
  const [gender, setGender] = React.useState(patient.gender || "F");
  const [whatsappOptIn, setWhatsappOptIn] = React.useState(patient.whatsappOptIn);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFirstName(patient.firstName);
    setLastName(patient.lastName);
    setPhone(patient.phone || "");
    setEmail(patient.email || "");
    setDateOfBirth(patient.dateOfBirth || "");
    setGender(patient.gender || "F");
    setWhatsappOptIn(patient.whatsappOptIn);
    setError(null);
  }, [patient, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("El nombre y apellido son obligatorios");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await updatePatientAction(patient.patientId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        whatsappOptIn,
      });

      if (!res.success) {
        throw new Error(res.error || "No se pudo actualizar el paciente");
      }

      onPatientUpdated({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        whatsappOptIn,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar paciente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Datos del Paciente</DialogTitle>
            <DialogDescription>
              Actualiza la información de contacto y demográfica del paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nombre</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Apellido</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Phone className="size-3 text-cyan-600" />
                  Teléfono
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Mail className="size-3 text-cyan-600" />
                  Correo
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="size-3 text-cyan-600" />
                  Nacimiento
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Género</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <input
                type="checkbox"
                id="whatsapp-optin"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="size-4 rounded border-border text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor="whatsapp-optin"
                className="text-xs text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="size-3.5 text-emerald-600" />
                <span>Autorizar notificaciones y recordatorios por WhatsApp</span>
              </label>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const EditPatientModal = EditPatientDialog;
