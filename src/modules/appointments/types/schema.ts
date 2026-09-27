import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  index,
  check,
  foreignKey,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from '../../organizations/types/schema';
import { users } from '../../users/types/schema';
import { patients } from '../../patients/types/schema';
import { dentists } from '../../dentists/types/schema';
import { locations } from '../../locations/types/schema';
import { resources } from '../../resources/types/schema';
import { services } from '../../services/types/schema';

/**
 * Appointments table.
 *
 * Cross-org protection: All entity FKs use composite (organization_id, entity_id)
 * to guarantee that referenced entities belong to the same organization.
 *
 * Double-booking protection: A PostgreSQL EXCLUDE constraint prevents overlapping
 * appointments per dentist for active statuses. This constraint is applied via
 * the custom migration script (scripts/migrate.ts) since Drizzle doesn't support
 * exclusion constraints natively.
 *
 * Future: Resource-level conflict protection (resource_id overlap) should be added
 * when resource scheduling is fully implemented.
 */
export const appointments = pgTable('appointments', {
  appointmentId: uuid('appointment_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  patientId: uuid('patient_id').notNull(),
  dentistId: uuid('dentist_id').notNull(),
  locationId: uuid('location_id').notNull(),
  resourceId: uuid('resource_id'),
  serviceId: uuid('service_id').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('SCHEDULED'),
  notes: text('notes'),
  createdByUserId: uuid('created_by_user_id').notNull(),
  serviceNameSnapshot: varchar('service_name_snapshot', { length: 255 }).notNull(),
  serviceDurationSnapshot: integer('service_duration_snapshot').notNull(),
  serviceValueSnapshot: numeric('service_value_snapshot', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Cross-org composite foreign keys
  foreignKey({
    name: 'fk_appointments_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  foreignKey({
    name: 'fk_appointments_org_dentist',
    columns: [table.organizationId, table.dentistId],
    foreignColumns: [dentists.organizationId, dentists.dentistId],
  }),
  foreignKey({
    name: 'fk_appointments_org_location',
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.locationId],
  }),
  foreignKey({
    name: 'fk_appointments_org_resource',
    columns: [table.organizationId, table.resourceId],
    foreignColumns: [resources.organizationId, resources.resourceId],
  }),
  foreignKey({
    name: 'fk_appointments_org_service',
    columns: [table.organizationId, table.serviceId],
    foreignColumns: [services.organizationId, services.serviceId],
  }),
  foreignKey({
    name: 'fk_appointments_org_created_by',
    columns: [table.organizationId, table.createdByUserId],
    foreignColumns: [users.organizationId, users.userId],
  }),
  // Cross-org composite unique constraint for referencing by events/waitlist
  unique('uq_appointments_org_appointment').on(table.organizationId, table.appointmentId),
  // Check constraints
  check('ck_appointments_end_after_start', sql`${table.endAt} > ${table.startAt}`),
  // Indexes
  index('idx_appointments_org_id').on(table.organizationId),
  index('idx_appointments_org_dentist_start').on(table.organizationId, table.dentistId, table.startAt),
  index('idx_appointments_org_patient').on(table.organizationId, table.patientId),
  index('idx_appointments_org_start').on(table.organizationId, table.startAt),
]);

/**
 * Appointment Events table (Append-only).
 *
 * Immutable event trail recording all lifecycle milestones and state transitions:
 * CREATED, CONFIRMED, CANCELLED, RESCHEDULED, COMPLETED, NO_SHOW,
 * RECOVERY_TRIGGERED, RECOVERY_OFFERED, RECOVERY_ACCEPTED, RECOVERY_DECLINED.
 *
 * Essential foundation for the Recovery Engine and clinical auditability.
 */
export const appointmentEvents = pgTable('appointment_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.appointmentId),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorType: varchar('actor_type', { length: 50 }).notNull().default('USER'),
  actorUserId: uuid('actor_user_id'),
  source: varchar('source', { length: 50 }).notNull().default('WEB'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    name: 'fk_appointment_events_org_appointment',
    columns: [table.organizationId, table.appointmentId],
    foreignColumns: [appointments.organizationId, appointments.appointmentId],
  }),
  index('idx_appointment_events_org_id').on(table.organizationId),
  index('idx_appointment_events_org_appointment').on(table.organizationId, table.appointmentId),
  index('idx_appointment_events_org_type').on(table.organizationId, table.eventType),
  index('idx_appointment_events_created_at').on(table.organizationId, table.createdAt),
]);

export type AppointmentEvent = typeof appointmentEvents.$inferSelect;
export type NewAppointmentEvent = typeof appointmentEvents.$inferInsert;

