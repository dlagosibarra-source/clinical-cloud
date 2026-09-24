"use client";

import * as React from "react";
import { Search, User, Phone, Plus, Check, X, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { searchPatientsAction } from "../../patients/actions/patient.actions";
import { NewPatientDialog } from "./new-patient-dialog";
import type { PatientOption } from "./types";

interface PatientSearchComboboxProps {
  selectedPatient: PatientOption | null;
  onSelectPatient: (patient: PatientOption | null) => void;
  // Optional preloaded or searched patients for demonstration & integration
  initialPatients?: PatientOption[];
}

export function PatientSearchCombobox({
  selectedPatient,
  onSelectPatient,
  initialPatients = [
    {
      id: "00000000-0000-4000-a000-000000000007",
      patientId: "00000000-0000-4000-a000-000000000007",
      firstName: "Ana",
      lastName: "García",
      phone: "+52 55 1234 5678",
      email: "ana.garcia@example.com",
    },
    {
      id: "00000000-0000-4000-a000-000000000017",
      patientId: "00000000-0000-4000-a000-000000000017",
      firstName: "Carlos",
      lastName: "Mendoza",
      phone: "+52 55 8765 4321",
      email: "carlos.m@example.com",
    },
    {
      id: "00000000-0000-4000-a000-000000000027",
      patientId: "00000000-0000-4000-a000-000000000027",
      firstName: "Elena",
      lastName: "Torres",
      phone: "+52 55 9988 7766",
      email: "elena.t@example.com",
    },
  ],
}: PatientSearchComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<PatientOption[] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounced search connected to searchPatientsAction
  React.useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchPatientsAction({ query, page: 1, limit: 10 });
        if (res.success && res.data && res.data.length > 0) {
          setSearchResults(
            res.data.map((p) => ({
              id: p.patientId,
              patientId: p.patientId,
              firstName: p.firstName,
              lastName: p.lastName,
              phone: p.phone,
              email: p.email,
            }))
          );
        } else {
          // Fallback to local filter for preview
          const lower = query.toLowerCase();
          setSearchResults(
            initialPatients.filter(
              (p) =>
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(lower) ||
                (p.phone && p.phone.includes(query))
            )
          );
        }
      } catch (err) {
        console.error("Error searching patients:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, initialPatients]);

  const filteredPatients = query.trim() ? (searchResults ?? []) : initialPatients;

  // Handle outside click to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePatientCreated = (newPatient: PatientOption) => {
    const patientWithId: PatientOption = {
      ...newPatient,
      id: newPatient.id || newPatient.patientId,
    };
    setSearchResults((prev) => [patientWithId, ...(prev ?? initialPatients)]);
    onSelectPatient(patientWithId);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="w-full space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="size-4 text-cyan-600 dark:text-cyan-400" />
          Paciente
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="text-xs text-primary font-medium hover:text-primary hover:bg-primary/10 gap-1 h-7 px-2"
        >
          <Plus className="size-3.5" />
          Nuevo Paciente
        </Button>
      </div>

      {selectedPatient ? (
        // Selected patient state chip
        <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 p-3.5 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white font-semibold text-sm shadow-xs">
              {selectedPatient.firstName[0]}
              {selectedPatient.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground truncate">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <Badge variant="clinical" className="text-[10px] py-0 px-1.5 h-4">
                  Seleccionado
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {selectedPatient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {selectedPatient.phone}
                  </span>
                )}
                {selectedPatient.email && (
                  <span className="truncate hidden sm:inline">
                    {selectedPatient.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onSelectPatient(null)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Cambiar paciente"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        // Search combobox input
        <div className="relative">
          <Input
            placeholder="Buscar por nombre o teléfono (+52...)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            startIcon={
              isSearching ? (
                <Loader2 className="size-4 animate-spin text-cyan-600" />
              ) : (
                <Search className="size-4" />
              )
            }
            className="h-11 rounded-xl bg-background border-border/80 text-sm"
          />

          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95">
              {filteredPatients.length > 0 ? (
                <div className="space-y-1">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.patientId}
                      type="button"
                      onClick={() => {
                        onSelectPatient(patient);
                        setIsOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-xs text-muted-foreground">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {patient.firstName} {patient.lastName}
                          </p>
                          {patient.phone && (
                            <p className="text-xs text-muted-foreground">
                              {patient.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <Check className="size-4 text-cyan-600 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    No se encontró ningún paciente con &quot;{query}&quot;
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(true);
                      setIsOpen(false);
                    }}
                    className="gap-1.5 text-xs w-full"
                  >
                    <Plus className="size-3.5" />
                    Registrar &quot;{query}&quot; como nuevo
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Add Patient Modal */}
      <NewPatientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
}
