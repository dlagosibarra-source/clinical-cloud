/**
 * Shared type definitions and constants for Clinical Cloud.
 *
 * These enums and types are used across multiple modules.
 * They reflect the domain model defined in the MVP Engineering Spec.
 */

// ─── Organization ───────────────────────────────────────────

export const OrganizationStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

// ─── User ───────────────────────────────────────────────────

export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  DENTIST: 'DENTIST',
  RECEPTIONIST: 'RECEPTIONIST',
  STAFF: 'STAFF',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// ─── Patient ────────────────────────────────────────────────

export const PatientStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type PatientStatus = (typeof PatientStatus)[keyof typeof PatientStatus];

// ─── Service ────────────────────────────────────────────────

export const ServiceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

// ─── Dentist ────────────────────────────────────────────────

export const DentistStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type DentistStatus = (typeof DentistStatus)[keyof typeof DentistStatus];

// ─── Location ───────────────────────────────────────────────

export const LocationStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type LocationStatus = (typeof LocationStatus)[keyof typeof LocationStatus];

// ─── Resource ───────────────────────────────────────────────

export const ResourceType = {
  CHAIR: 'CHAIR',
  ROOM: 'ROOM',
  EQUIPMENT: 'EQUIPMENT',
  OTHER: 'OTHER',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const ResourceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type ResourceStatus = (typeof ResourceStatus)[keyof typeof ResourceStatus];

// ─── Appointment ────────────────────────────────────────────

export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED',
} as const;

export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// ─── Actor & Source ─────────────────────────────────────────

export const ActorType = {
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  AI: 'AI',
  PATIENT: 'PATIENT',
  INTEGRATION: 'INTEGRATION',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const Source = {
  WEB: 'WEB',
  MOBILE: 'MOBILE',
  WHATSAPP: 'WHATSAPP',
  API: 'API',
  SYSTEM: 'SYSTEM',
  ADMIN: 'ADMIN',
} as const;

export type Source = (typeof Source)[keyof typeof Source];

// ─── Auth Context ───────────────────────────────────────────

export interface AuthContext {
  user_id: string;
  organization_id: string;
  role: UserRole;
}
