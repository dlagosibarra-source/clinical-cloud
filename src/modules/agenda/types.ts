export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "RESCHEDULED";

export interface AgendaPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  whatsappOptIn?: boolean;
}

export interface AgendaDentist {
  dentistId: string;
  firstName: string;
  lastName: string;
  professionalName?: string | null;
  specialty?: string | null;
  avatarUrl?: string;
  color?: string; // Hex or tailwind identifier for lane branding
}

export interface AgendaLocation {
  locationId: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface AgendaService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: number | string;
  currency: string;
}

export interface AgendaAppointment {
  appointmentId: string;
  patientId: string;
  patient: AgendaPatient;
  dentistId: string;
  dentist: AgendaDentist;
  locationId: string;
  location: AgendaLocation;
  serviceId: string;
  service: AgendaService;
  startAt: string; // ISO string
  endAt: string; // ISO string
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string | null;
  serviceNameSnapshot: string;
  serviceDurationSnapshot: number;
  serviceValueSnapshot: string | number | null;
}

export type AgendaViewMode = "day" | "week";

export interface AgendaFilters {
  selectedDate: string; // YYYY-MM-DD
  selectedLocationId: string; // "ALL" or specific UUID
  selectedDentistIds: string[]; // empty array means ALL
  viewMode: AgendaViewMode;
}
