"use client";

import * as React from "react";
import type { PatientListItem, PatientsPagination } from "../types";
import { Input } from "../../../components/ui/input";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { NewPatientDialog } from "../../appointments/components/new-patient-dialog";
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CalendarPlus,
  MessageSquare,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "cn";

interface PatientsDataGridProps {
  initialPatients: PatientListItem[];
  initialPagination?: PatientsPagination;
  onSearch?: (query: string, page: number) => Promise<{
    data: PatientListItem[];
    pagination: PatientsPagination;
  }>;
}

export function PatientsDataGrid({
  initialPatients,
  initialPagination = { page: 1, limit: 10, total: initialPatients.length, totalPages: 1 },
  onSearch,
}: PatientsDataGridProps) {
  const [query, setQuery] = React.useState("");
  const [patients, setPatients] = React.useState<PatientListItem[]>(initialPatients);
  const [pagination, setPagination] = React.useState<PatientsPagination>(initialPagination);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = React.useState(false);

  // Search handler with debounce
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (onSearch) {
        setIsSearching(true);
        try {
          const res = await onSearch(query, 1);
          setPatients(res.data);
          setPagination(res.pagination);
        } catch (err) {
          console.error("Error searching patients:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        // Fallback local filtering
        const lower = query.toLowerCase();
        const filtered = initialPatients.filter(
          (p) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(lower) ||
            (p.phone && p.phone.includes(query)) ||
            (p.email && p.email.toLowerCase().includes(lower))
        );
        setPatients(filtered);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, onSearch, initialPatients]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    if (onSearch) {
      setIsSearching(true);
      try {
        const res = await onSearch(query, newPage);
        setPatients(res.data);
        setPagination(res.pagination);
      } catch (err) {
        console.error("Error changing page:", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handlePatientCreated = (newPatient: any) => {
    const newItem: PatientListItem = {
      patientId: newPatient.patientId || newPatient.id,
      firstName: newPatient.firstName,
      lastName: newPatient.lastName,
      phone: newPatient.phone || null,
      email: newPatient.email || null,
      dateOfBirth: newPatient.dateOfBirth || null,
      gender: newPatient.gender || null,
      whatsappOptIn: newPatient.whatsappOptIn ?? true,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      lastAppointmentDate: null,
      totalAppointments: 0,
    };
    setPatients((prev) => [newItem, ...prev]);
    setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Sin citas previas";
    const d = new Date(isoString);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o correo..."
            className="pl-9 h-10 text-xs rounded-xl bg-muted/20 border-border/80 focus:bg-card"
          />
        </div>

        {/* Action Button: + Nuevo Paciente */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsNewPatientOpen(true)}
            className="h-10 px-4 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs gap-1.5"
          >
            <Plus className="size-4" />
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* Patients Data Table / Card Grid */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-border/80 bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Paciente</div>
          <div className="col-span-3">Contacto</div>
          <div className="col-span-2">Última Cita</div>
          <div className="col-span-1 text-center">Citas</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/60">
          {patients.length > 0 ? (
            patients.map((patient) => (
              <div
                key={patient.patientId}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 sm:px-6 py-4 items-center hover:bg-muted/20 transition-colors"
              >
                {/* 1. Patient Info */}
                <div className="col-span-1 md:col-span-4 flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-600/10 text-cyan-700 dark:text-cyan-300 font-bold text-xs border border-cyan-500/20">
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/pacientes/${patient.patientId}`}
                      className="font-semibold text-xs sm:text-sm text-foreground hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors truncate block"
                    >
                      {patient.firstName} {patient.lastName}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        ID: {patient.patientId.slice(0, 8)}...
                      </span>
                      {patient.whatsappOptIn && (
                        <Badge
                          variant="success"
                          className="text-[9px] px-1 py-0 h-3.5 gap-0.5"
                          title="WhatsApp Autorizado"
                        >
                          <MessageSquare className="size-2.5" />
                          WA
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Contact Info */}
                <div className="col-span-1 md:col-span-3 space-y-0.5 text-xs">
                  {patient.phone ? (
                    <a
                      href={`tel:${patient.phone}`}
                      className="text-foreground hover:underline flex items-center gap-1.5 truncate"
                    >
                      <Phone className="size-3 text-cyan-600 shrink-0" />
                      <span>{patient.phone}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">
                      Sin teléfono
                    </span>
                  )}
                  {patient.email ? (
                    <a
                      href={`mailto:${patient.email}`}
                      className="text-muted-foreground hover:underline flex items-center gap-1.5 truncate text-[11px]"
                    >
                      <Mail className="size-3 text-cyan-600 shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </a>
                  ) : null}
                </div>

                {/* 3. Last Appointment */}
                <div className="col-span-1 md:col-span-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-cyan-600 shrink-0" />
                  <span className="capitalize truncate">
                    {formatDate(patient.lastAppointmentDate)}
                  </span>
                </div>

                {/* 4. Total Appointments */}
                <div className="col-span-1 md:col-span-1 flex md:justify-center items-center">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {patient.totalAppointments ?? 0}
                  </Badge>
                </div>

                {/* 5. Actions */}
                <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-1.5 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                  <Link
                    href={`/pacientes/${patient.patientId}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-8 px-2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                    )}
                  >
                    <ExternalLink className="size-3.5 mr-1" />
                    Perfil
                  </Link>

                  <Link
                    href={`/citas/nueva?patientId=${patient.patientId}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-8 px-2.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white gap-1 rounded-lg inline-flex items-center justify-center"
                    )}
                  >
                    <CalendarPlus className="size-3.5" />
                    Agendar
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="size-6" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                No se encontraron pacientes
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {query
                  ? `No hay coincidencias para "${query}". Intenta con otro término de búsqueda.`
                  : "Aún no hay pacientes registrados en esta organización. Comienza creando el primero."}
              </p>
              <Button
                size="sm"
                onClick={() => setIsNewPatientOpen(true)}
                className="mt-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
              >
                <Plus className="size-3.5 mr-1" />
                Registrar Paciente
              </Button>
            </div>
          )}
        </div>

        {/* Table Footer with Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Total: <strong className="text-foreground">{pagination.total}</strong> pacientes
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || isSearching}
                className="size-8 p-0"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                Página <strong className="text-foreground">{pagination.page}</strong> de{" "}
                {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isSearching}
                className="size-8 p-0"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for New Patient */}
      <NewPatientDialog
        open={isNewPatientOpen}
        onOpenChange={setIsNewPatientOpen}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
}
