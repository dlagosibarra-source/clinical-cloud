"use client";

import * as React from "react";
import { PatientSearchCombobox } from "./patient-search-combobox";
import { LocationDentistServiceSelector } from "./location-dentist-service-selector";
import { DateTimeSlotPicker } from "./date-time-slot-picker";
import { AppointmentSummaryCard } from "./appointment-summary-card";
import type {
  BookingState,
  PatientOption,
  LocationOption,
  DentistOption,
  ServiceOption,
  TimeSlot,
} from "./types";
import { CalendarDays } from "lucide-react";

import { createAppointmentAction } from "../actions/appointment.actions";
import { getAvailableSlotsAction } from "../../availability/actions/availability.actions";
import { localToUtc } from "@/shared/utils/date-time";

interface AppointmentBookingFlowProps {
  initialPatients?: PatientOption[];
  initialLocations?: LocationOption[];
  initialDentists?: DentistOption[];
  initialServices?: ServiceOption[];
  onConfirmAppointment?: (bookingData: {
    patient_id?: string;
    location_id?: string;
    dentist_id?: string;
    service_id?: string;
    start_at?: string;
    patientId: string;
    dentistId: string;
    locationId: string;
    serviceId: string;
    startAt: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function AppointmentBookingFlow({
  initialPatients,
  initialLocations = [
    {
      id: "00000000-0000-4000-a000-000000000004",
      locationId: "00000000-0000-4000-a000-000000000004",
      name: "Sucursal Central Polanco",
      code: "POL-01",
      address: "Av. Homero 1425, Int 302",
      city: "Ciudad de México",
      timezone: "America/Mexico_City",
    },
    {
      id: "00000000-0000-4000-a000-000000000014",
      locationId: "00000000-0000-4000-a000-000000000014",
      name: "Sucursal Santa Fe",
      code: "STF-02",
      address: "Vasco de Quiroga 3800",
      city: "Ciudad de México",
      timezone: "America/Mexico_City",
    },
  ],
  initialDentists = [
    {
      id: "00000000-0000-4000-a000-000000000003",
      dentistId: "00000000-0000-4000-a000-000000000003",
      firstName: "Carlos",
      lastName: "Ramírez",
      professionalName: "Dr. Carlos Ramírez",
      specialty: "Ortodoncia e Implantes",
      phone: "+52 55 2233 4455",
    },
    {
      id: "00000000-0000-4000-a000-000000000013",
      dentistId: "00000000-0000-4000-a000-000000000013",
      firstName: "Valeria",
      lastName: "Montes",
      professionalName: "Dra. Valeria Montes",
      specialty: "Odontopediatría",
      phone: "+52 55 3344 5566",
    },
    {
      id: "00000000-0000-4000-a000-000000000023",
      dentistId: "00000000-0000-4000-a000-000000000023",
      firstName: "Sebastián",
      lastName: "Ríos",
      professionalName: "Dr. Sebastián Ríos",
      specialty: "Endodoncia",
      phone: "+52 55 4455 6677",
    },
  ],
  initialServices = [
    {
      id: "00000000-0000-4000-a000-000000000006",
      serviceId: "00000000-0000-4000-a000-000000000006",
      name: "Limpieza Profunda y Profilaxis",
      description: "Eliminación de sarro ultrasónica, pulido y flúor protector.",
      durationMinutes: 30,
      price: 650,
      currency: "MXN",
    },
    {
      id: "00000000-0000-4000-a000-000000000016",
      serviceId: "00000000-0000-4000-a000-000000000016",
      name: "Valoración General y Diagnóstico",
      description: "Revisión clínica completa con cámara intraoral.",
      durationMinutes: 30,
      price: 400,
      currency: "MXN",
    },
    {
      id: "00000000-0000-4000-a000-000000000026",
      serviceId: "00000000-0000-4000-a000-000000000026",
      name: "Resina Dental Estética",
      description: "Restauración anatómica con composite de alta estética.",
      durationMinutes: 45,
      price: 950,
      currency: "MXN",
    },
    {
      id: "00000000-0000-4000-a000-000000000036",
      serviceId: "00000000-0000-4000-a000-000000000036",
      name: "Blanqueamiento Dental LED",
      description: "Aclaramiento dental en consultorio con peróxido activado.",
      durationMinutes: 60,
      price: 2400,
      currency: "MXN",
    },
  ],
  onConfirmAppointment,
}: AppointmentBookingFlowProps) {
  // Today date formatted YYYY-MM-DD
  const todayStr = React.useMemo(
    () => new Date().toISOString().split("T")[0]!,
    []
  );

  // Main Booking State
  const [bookingState, setBookingState] = React.useState<BookingState>({
    patient: null,
    location: initialLocations[0] || null,
    dentist: initialDentists[0] || null,
    service: initialServices[0] || null,
    date: todayStr,
    slot: null,
    notes: "",
  });

  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [backendSlots, setBackendSlots] = React.useState<TimeSlot[] | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Connect to getAvailableSlotsAction
  React.useEffect(() => {
    let active = true;
    if (!bookingState.dentist || !bookingState.service || !bookingState.date) {
      return;
    }

    async function fetchSlots() {
      setIsLoadingSlots(true);
      try {
        const res = await getAvailableSlotsAction({
          dentistId: bookingState.dentist!.dentistId,
          serviceId: bookingState.service!.serviceId,
          date: bookingState.date,
        });

        if (active && res.success && res.data && res.data.slots.length > 0) {
          const mapped: TimeSlot[] = res.data.slots.map((timeStr: string) => {
            const [hourStr] = timeStr.split(":");
            const hour = parseInt(hourStr || "0", 10);
            const period: "morning" | "afternoon" = hour < 13 ? "morning" : "afternoon";
            const startAt = `${bookingState.date}T${timeStr}:00.000Z`;
            const duration = bookingState.service?.durationMinutes || 30;
            const endAt = new Date(new Date(startAt).getTime() + duration * 60000).toISOString();

            return {
              time: timeStr,
              startAt,
              endAt,
              available: true,
              period,
            };
          });
          setBackendSlots(mapped);
        } else if (active) {
          setBackendSlots(null);
        }
      } catch (err) {
        console.error("Error fetching available slots:", err);
      } finally {
        if (active) {
          setIsLoadingSlots(false);
        }
      }
    }

    fetchSlots();

    return () => {
      active = false;
    };
  }, [bookingState.dentist, bookingState.service, bookingState.date]);

  // Fallback slots for interactive preview
  const fallbackSlots = React.useMemo<TimeSlot[]>(() => {
    return [
      // Mañana
      { time: "09:00", startAt: `${bookingState.date}T09:00:00.000Z`, endAt: `${bookingState.date}T09:30:00.000Z`, available: true, period: "morning" },
      { time: "09:30", startAt: `${bookingState.date}T09:30:00.000Z`, endAt: `${bookingState.date}T10:00:00.000Z`, available: true, period: "morning" },
      { time: "10:00", startAt: `${bookingState.date}T10:00:00.000Z`, endAt: `${bookingState.date}T10:30:00.000Z`, available: false, period: "morning" },
      { time: "10:30", startAt: `${bookingState.date}T10:30:00.000Z`, endAt: `${bookingState.date}T11:00:00.000Z`, available: true, period: "morning" },
      { time: "11:00", startAt: `${bookingState.date}T11:00:00.000Z`, endAt: `${bookingState.date}T11:30:00.000Z`, available: true, period: "morning" },
      { time: "11:30", startAt: `${bookingState.date}T11:30:00.000Z`, endAt: `${bookingState.date}T12:00:00.000Z`, available: true, period: "morning" },
      // Tarde
      { time: "15:00", startAt: `${bookingState.date}T15:00:00.000Z`, endAt: `${bookingState.date}T15:30:00.000Z`, available: true, period: "afternoon" },
      { time: "15:30", startAt: `${bookingState.date}T15:30:00.000Z`, endAt: `${bookingState.date}T16:00:00.000Z`, available: false, period: "afternoon" },
      { time: "16:00", startAt: `${bookingState.date}T16:00:00.000Z`, endAt: `${bookingState.date}T16:30:00.000Z`, available: true, period: "afternoon" },
      { time: "16:30", startAt: `${bookingState.date}T16:30:00.000Z`, endAt: `${bookingState.date}T17:00:00.000Z`, available: true, period: "afternoon" },
      { time: "17:00", startAt: `${bookingState.date}T17:00:00.000Z`, endAt: `${bookingState.date}T17:30:00.000Z`, available: true, period: "afternoon" },
      { time: "17:30", startAt: `${bookingState.date}T17:30:00.000Z`, endAt: `${bookingState.date}T18:00:00.000Z`, available: true, period: "afternoon" },
    ];
  }, [bookingState.date]);

  const availableSlots = backendSlots && backendSlots.length > 0 ? backendSlots : fallbackSlots;

  // Handlers for state updates
  const handleSelectPatient = (patient: PatientOption | null) => {
    setBookingState((prev) => ({ ...prev, patient }));
  };

  const handleSelectLocation = (location: LocationOption) => {
    setBookingState((prev) => ({ ...prev, location }));
  };

  const handleSelectDentist = (dentist: DentistOption) => {
    setBookingState((prev) => ({ ...prev, dentist, slot: null }));
  };

  const handleSelectService = (service: ServiceOption) => {
    setBookingState((prev) => ({ ...prev, service, slot: null }));
  };

  const handleSelectDate = (date: string) => {
    setBookingState((prev) => ({ ...prev, date, slot: null }));
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setBookingState((prev) => ({ ...prev, slot }));
  };

  // Submit handler connected to createAppointmentAction
  const handleConfirmAppointment = async () => {
    if (
      !bookingState.patient ||
      !bookingState.dentist ||
      !bookingState.location ||
      !bookingState.service ||
      !bookingState.slot
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Ensure date and slot time are properly combined into a valid Date object / ISO string
      let calculatedStartDate: Date;
      const branchTz = bookingState.location?.timezone || "America/Mexico_City";
      if (bookingState.slot.time && bookingState.date) {
        const timePart = bookingState.slot.time.trim();
        calculatedStartDate = localToUtc(bookingState.date, timePart, branchTz);
      } else {
        calculatedStartDate = new Date(bookingState.slot.startAt);
      }

      const selectedPatient = bookingState.patient;
      const selectedLocation = bookingState.location;
      const selectedDentist = bookingState.dentist;
      const selectedService = bookingState.service;

      const patientId = selectedPatient.id || selectedPatient.patientId;
      const locationId = selectedLocation.id || selectedLocation.locationId;
      const dentistId = selectedDentist.id || selectedDentist.dentistId;
      const serviceId = selectedService.id || selectedService.serviceId;

      const payload = {
        patient_id: patientId,
        location_id: locationId,
        dentist_id: dentistId,
        service_id: serviceId,
        date: bookingState.date,
        time: bookingState.slot?.time,
        timezone: branchTz,
        start_at: calculatedStartDate.toISOString(),
        // Also provide camelCase fields for backward compatibility
        patientId,
        locationId,
        dentistId,
        serviceId,
        startAt: calculatedStartDate.toISOString(),
        notes: bookingState.notes,
      };

      if (onConfirmAppointment) {
        const result = await onConfirmAppointment(payload);

        if (!result.success) {
          throw new Error(result.error || "No se pudo agendar la cita.");
        }
      } else {
        const res = await createAppointmentAction(payload);

        if (!res.success) {
          throw new Error(res.error || "No se pudo agendar la cita.");
        }
      }

      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Error inesperado al agendar la cita."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Agendamiento de Citas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configura y reserva turnos clínicos con validación de disponibilidad en tiempo real.
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna 1: Panel Principal de Configuración (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Paso 1: Paciente */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                Paso 1 de 3
              </span>
              <span className="text-xs text-muted-foreground">Datos del Paciente</span>
            </div>
            <PatientSearchCombobox
              selectedPatient={bookingState.patient}
              onSelectPatient={handleSelectPatient}
              initialPatients={initialPatients}
            />
          </div>

          {/* Paso 2: Sucursal, Odontólogo y Servicio */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                Paso 2 de 3
              </span>
              <span className="text-xs text-muted-foreground">Detalles del Tratamiento</span>
            </div>
            <LocationDentistServiceSelector
              locations={initialLocations}
              selectedLocation={bookingState.location}
              onSelectLocation={handleSelectLocation}
              dentists={initialDentists}
              selectedDentist={bookingState.dentist}
              onSelectDentist={handleSelectDentist}
              services={initialServices}
              selectedService={bookingState.service}
              onSelectService={handleSelectService}
            />
          </div>

          {/* Paso 3: Fecha y Slots Horarios */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                Paso 3 de 3
              </span>
              <span className="text-xs text-muted-foreground">Fecha y Turno</span>
            </div>
            <DateTimeSlotPicker
              selectedDate={bookingState.date}
              onSelectDate={handleSelectDate}
              slots={availableSlots}
              selectedSlot={bookingState.slot}
              onSelectSlot={handleSelectSlot}
              isLoadingSlots={isLoadingSlots}
            />
          </div>
        </div>

        {/* Columna 2: Panel Lateral Sticky de Resumen (4 cols) */}
        <div className="lg:col-span-4">
          <AppointmentSummaryCard
            bookingState={bookingState}
            onConfirm={handleConfirmAppointment}
            isLoading={isSubmitting}
            error={submitError}
            success={submitSuccess}
          />
        </div>
      </div>
    </div>
  );
}
