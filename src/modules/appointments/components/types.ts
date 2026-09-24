export interface PatientOption {
  id?: string;
  patientId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  whatsappOptIn?: boolean;
}

export interface DentistOption {
  id?: string;
  dentistId: string;
  firstName: string;
  lastName: string;
  professionalName?: string | null;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface LocationOption {
  id?: string;
  locationId: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface ServiceOption {
  id?: string;
  serviceId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: string | number;
  currency?: string;
}

export interface TimeSlot {
  time: string; // "09:00", "09:30", etc.
  startAt: string; // ISO string
  endAt: string; // ISO string
  available: boolean;
  period: "morning" | "afternoon";
}

export interface BookingState {
  patient: PatientOption | null;
  location: LocationOption | null;
  dentist: DentistOption | null;
  service: ServiceOption | null;
  date: string; // YYYY-MM-DD
  slot: TimeSlot | null;
  notes: string;
}
