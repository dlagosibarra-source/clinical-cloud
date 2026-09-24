"use client";

import * as React from "react";
import type {
  AgendaAppointment,
  AgendaDentist,
  AgendaLocation,
  AgendaViewMode,
  AppointmentStatus,
} from "../types";
import {
  MOCK_DENTISTS,
  MOCK_LOCATIONS,
} from "../mock-data";
import { useRouter } from "next/navigation";
import {
  getAgendaAppointmentsAction,
  updateAppointmentStatusAction,
} from "../../appointments/actions/appointment.actions";
import { AgendaHeader } from "./AgendaHeader";
import { TimeGrid } from "./TimeGrid";
import { AppointmentDetailsPanel } from "./AppointmentDetailsPanel";
import { Badge } from "../../../components/ui/badge";
import { CalendarDays, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { getAppointmentTimeParts, getClinicTodayDateStr } from "@/shared/utils/date-time";

interface AgendaViewProps {
  initialDate?: string;
  initialAppointments?: AgendaAppointment[];
  initialDentists?: AgendaDentist[];
  initialLocations?: AgendaLocation[];
}

export function AgendaView({
  initialDate,
  initialAppointments,
  initialDentists,
  initialLocations,
}: AgendaViewProps) {
  // Today's date YYYY-MM-DD in clinic's timezone (America/Mazatlan)
  const todayStr = React.useMemo(() => {
    return initialDate || getClinicTodayDateStr("America/Mazatlan");
  }, [initialDate]);

  // Filter State
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);
  const [selectedLocationId, setSelectedLocationId] = React.useState<string>("ALL");
  const [selectedDentistIds, setSelectedDentistIds] = React.useState<string[]>([]);
  const [viewMode, setViewMode] = React.useState<AgendaViewMode>("day");
  const [isLoading, setIsLoading] = React.useState(false);

  // Entities State
  const [dentists, setDentists] = React.useState<AgendaDentist[]>(
    initialDentists && initialDentists.length > 0 ? initialDentists : MOCK_DENTISTS
  );
  const [locations, setLocations] = React.useState<AgendaLocation[]>(
    initialLocations && initialLocations.length > 0 ? initialLocations : MOCK_LOCATIONS
  );

  // Active timezone based on selected branch filter
  const activeTimezone = React.useMemo(() => {
    if (selectedLocationId !== "ALL") {
      const found = locations.find((l) => l.locationId === selectedLocationId);
      if (found?.timezone) return found.timezone;
    }
    const firstWithTz = locations.find((l) => l.timezone);
    return firstWithTz?.timezone || "America/Mexico_City";
  }, [selectedLocationId, locations]);

  // Selected Appointment for Slide-Over
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<AgendaAppointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const router = useRouter();

  // Appointments State (initialized with server-provided real data or empty)
  const [appointments, setAppointments] = React.useState<AgendaAppointment[]>(
    initialAppointments ?? []
  );

  // Synchronize appointments when server-side initialAppointments updates
  React.useEffect(() => {
    if (initialAppointments) {
      setAppointments(initialAppointments);
    }
  }, [initialAppointments]);

  // Fetch real appointments when date or location filter changes
  React.useEffect(() => {
    let active = true;

    async function fetchAgenda() {
      setIsLoading(true);
      try {
        const res = await getAgendaAppointmentsAction(selectedDate, selectedLocationId);
        if (active && res.success && res.data) {
          setAppointments(res.data);
          if (res.dentists && res.dentists.length > 0) {
            setDentists(res.dentists);
          }
          if (res.locations && res.locations.length > 0) {
            setLocations(res.locations);
          }
        }
      } catch (err) {
        console.error("Error fetching agenda appointments:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchAgenda();

    return () => {
      active = false;
    };
  }, [selectedDate, selectedLocationId]);

  // Real-time Polling: Refresh agenda every 15 seconds to display WhatsApp bookings automatically
  React.useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
      // Silently refresh appointments state in background without full UI flicker
      getAgendaAppointmentsAction(selectedDate, selectedLocationId)
        .then((res) => {
          if (res.success && res.data) {
            setAppointments(res.data);
            if (res.dentists && res.dentists.length > 0) {
              setDentists(res.dentists);
            }
            if (res.locations && res.locations.length > 0) {
              setLocations(res.locations);
            }
          }
        })
        .catch((err) => {
          console.error("[Agenda Polling] Error refreshing appointments:", err);
        });
    }, 15000);

    return () => clearInterval(interval);
  }, [router, selectedDate, selectedLocationId]);

  // Status feedback toast / notice
  const [statusFeedback, setStatusFeedback] = React.useState<{
    type: "success" | "info" | "warning";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (statusFeedback) {
      const timer = setTimeout(() => setStatusFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusFeedback]);

  // Handlers
  const handleToggleDentist = (dentistId: string) => {
    setSelectedDentistIds((prev) => {
      if (prev.includes(dentistId)) {
        return prev.filter((id) => id !== dentistId);
      } else {
        return [...prev, dentistId];
      }
    });
  };

  const handleSelectAllDentists = () => {
    setSelectedDentistIds([]);
  };

  const handleOpenDetails = (appointment: AgendaAppointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
  };

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => {
    // Optimistic UI update
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.appointmentId === appointmentId
          ? { ...apt, status: newStatus }
          : apt
      )
    );

    if (selectedAppointment && selectedAppointment.appointmentId === appointmentId) {
      setSelectedAppointment((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await updateAppointmentStatusAction(appointmentId, newStatus);
      if (!res.success) {
        console.error("Failed to update appointment status:", res.error);
        setStatusFeedback({
          type: "warning",
          message: `Error al actualizar cita: ${res.error || "Error del servidor"}`,
        });
        return;
      }

      if (newStatus === "CANCELLED") {
        setStatusFeedback({
          type: "warning",
          message: "Cita cancelada. El turno ha sido liberado para recuperación de citas.",
        });
      } else if (newStatus === "COMPLETED") {
        setStatusFeedback({
          type: "success",
          message: "Cita marcada como completada con éxito.",
        });
      } else if (newStatus === "CONFIRMED") {
        setStatusFeedback({
          type: "success",
          message: "Cita confirmada correctamente.",
        });
      }
    } catch (err) {
      console.error("Network error updating appointment status:", err);
      setStatusFeedback({
        type: "warning",
        message: "Error de conexión al actualizar estado de la cita.",
      });
    }
  };

  // Filtered Dentists according to selection
  // Filtered Dentists according to selection
  const activeDentists = React.useMemo(() => {
    if (selectedDentistIds.length === 0) {
      return dentists;
    }
    return dentists.filter((d) => selectedDentistIds.includes(d.dentistId));
  }, [dentists, selectedDentistIds]);

  // Filtered Appointments according to Location
  const locationFilteredAppointments = React.useMemo(() => {
    if (selectedLocationId === "ALL") {
      return appointments;
    }
    return appointments.filter((a) => a.locationId === selectedLocationId);
  }, [appointments, selectedLocationId]);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Toast notification */}
      {statusFeedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-card border border-border p-3.5 shadow-lg text-xs animate-in slide-in-from-bottom-5 duration-200">
          {statusFeedback.type === "success" && (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          )}
          {statusFeedback.type === "warning" && (
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
          )}
          <span className="font-medium text-foreground">{statusFeedback.message}</span>
        </div>
      )}

      {/* Header controls & filters */}
      <AgendaHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        locations={locations}
        selectedLocationId={selectedLocationId}
        onLocationChange={setSelectedLocationId}
        dentists={dentists}
        selectedDentistIds={selectedDentistIds}
        onToggleDentist={handleToggleDentist}
        onSelectAllDentists={handleSelectAllDentists}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main TimeGrid View */}
      <TimeGrid
        dentists={activeDentists}
        appointments={locationFilteredAppointments}
        selectedDate={selectedDate}
        viewMode={viewMode}
        timeZone={activeTimezone}
        onAppointmentClick={handleOpenDetails}
      />

      {/* Slide-over details panel */}
      <AppointmentDetailsPanel
        appointment={selectedAppointment}
        isOpen={isDetailsOpen}
        timeZone={selectedAppointment?.location?.timezone || activeTimezone}
        onClose={handleCloseDetails}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
