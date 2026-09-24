"use client";

import * as React from "react";
import { User, Phone, Mail, UserPlus, Loader2, Calendar, MessageSquare } from "lucide-react";
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
import { createPatientAction } from "../../patients/actions/patient.actions";
import type { PatientOption } from "./types";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated: (patient: PatientOption) => void;
}

export function NewPatientDialog({
  open,
  onOpenChange,
  onPatientCreated,
}: NewPatientDialogProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [gender, setGender] = React.useState("F");
  const [whatsappOptIn, setWhatsappOptIn] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Nombre y apellido son obligatorios");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createPatientAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        gender: gender || undefined,
        whatsappOptIn,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Error al registrar paciente");
      }

      onPatientCreated({
        id: res.data.patientId,
        patientId: res.data.patientId,
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        phone: res.data.phone,
        email: res.data.email,
        dateOfBirth: res.data.dateOfBirth,
        gender: res.data.gender,
        whatsappOptIn: res.data.whatsappOptIn,
      });

      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setDateOfBirth("");
      setGender("F");
      setWhatsappOptIn(true);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar paciente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="size-5" />
            </div>
            <div>
              <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
              <DialogDescription>
                Ingresa los datos demográficos y de contacto del paciente para agendar su cita.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Nombre <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej. Ana"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                startIcon={<User className="size-4" />}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Apellido <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej. García"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Teléfono y Correo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                <Phone className="size-3 text-cyan-600" />
                Teléfono (WhatsApp)
              </label>
              <Input
                placeholder="+52 55 1234 5678"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                <Mail className="size-3 text-cyan-600" />
                Correo Electrónico
              </label>
              <Input
                placeholder="ana.garcia@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Fecha de Nacimiento y Género */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                <Calendar className="size-3 text-cyan-600" />
                Fecha de Nacimiento
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Género
              </label>
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

          {/* Autorización de WhatsApp */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <input
              type="checkbox"
              id="new-patient-whatsapp-optin"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              className="size-4 rounded border-border text-cyan-600 focus:ring-cyan-500"
            />
            <label
              htmlFor="new-patient-whatsapp-optin"
              className="text-xs text-foreground cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="size-3.5 text-emerald-600" />
              <span>Autorizar notificaciones y recordatorios por WhatsApp</span>
            </label>
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
            <Button type="submit" disabled={loading} className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar y Seleccionar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const CreatePatientModal = NewPatientDialog;
