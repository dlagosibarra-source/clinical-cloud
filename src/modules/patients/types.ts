import type { AppointmentStatus } from "../agenda/types";

export interface PatientListItem {
  patientId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  whatsappOptIn: boolean;
  status: string;
  createdAt: string;
  lastAppointmentDate?: string | null;
  totalAppointments?: number;
}

export interface PatientHistoryItem {
  appointmentId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  serviceName: string;
  dentistName: string;
  dentistSpecialty?: string | null;
  serviceValue?: string | number | null;
  durationMinutes: number;
  notes?: string | null;
}

export interface PatientProfileData {
  patientId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  whatsappOptIn: boolean;
  status: string;
  createdAt: string;
  history: PatientHistoryItem[];
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
  };
}

export interface PatientsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
