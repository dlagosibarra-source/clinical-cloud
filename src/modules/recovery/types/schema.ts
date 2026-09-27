import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  timestamp,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';
import { patients } from '../../patients/types/schema';
import { services } from '../../services/types/schema';
import { dentists } from '../../dentists/types/schema';
import { locations } from '../../locations/types/schema';
import { appointments } from '../../appointments/types/schema';

/**
 * Waitlist table (Section 18 of MVP Engineering Spec).
 *
 * Tracks patients who want to be notified when a slot opens.
 * Matching is strictly deterministic — AI must NOT select the winner.
 *
 * Statuses: WAITING → OFFERED → ACCEPTED / EXPIRED / CANCELLED / FULFILLED
 */
export const waitlist = pgTable('waitlist', {
  waitlistId: uuid('waitlist_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  patientId: uuid('patient_id').notNull(),
  serviceId: uuid('service_id').notNull(),
  dentistId: uuid('dentist_id'),      // nullable — patient may not have a preference
  locationId: uuid('location_id'),     // nullable — patient may accept any branch
  preferredDateStart: date('preferred_date_start').notNull(),
  preferredDateEnd: date('preferred_date_end').notNull(),
  preferredTimeStart: varchar('preferred_time_start', { length: 5 }).notNull().default('08:00'),
  preferredTimeEnd: varchar('preferred_time_end', { length: 5 }).notNull().default('20:00'),
  priority: integer('priority').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('WAITING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Composite unique for cross-module FK referencing
  unique('uq_waitlist_org_waitlist').on(table.organizationId, table.waitlistId),
  // Cross-org composite foreign keys
  foreignKey({
    name: 'fk_waitlist_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  foreignKey({
    name: 'fk_waitlist_org_service',
    columns: [table.organizationId, table.serviceId],
    foreignColumns: [services.organizationId, services.serviceId],
  }),
  foreignKey({
    name: 'fk_waitlist_org_dentist',
    columns: [table.organizationId, table.dentistId],
    foreignColumns: [dentists.organizationId, dentists.dentistId],
  }),
  foreignKey({
    name: 'fk_waitlist_org_location',
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.locationId],
  }),
  // Performance indexes
  index('idx_waitlist_org_id').on(table.organizationId),
  index('idx_waitlist_org_status').on(table.organizationId, table.status),
  index('idx_waitlist_org_patient').on(table.organizationId, table.patientId),
  index('idx_waitlist_org_service').on(table.organizationId, table.serviceId),
]);

/**
 * Recovery Offers table (Section 19 of MVP Engineering Spec).
 *
 * Links a freed slot (cancelled appointment) to a waitlist candidate.
 * Acceptance MUST use an atomic transaction so two patients cannot
 * successfully claim the same appointment slot.
 *
 * Statuses: PENDING → ACCEPTED / DECLINED / EXPIRED / CANCELLED
 */
export const recoveryOffers = pgTable('recovery_offers', {
  offerId: uuid('offer_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  waitlistId: uuid('waitlist_id').notNull(),
  appointmentId: uuid('appointment_id').notNull(), // the cancelled appointment whose slot is being offered
  patientId: uuid('patient_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  offeredAt: timestamp('offered_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Cross-org composite foreign keys
  foreignKey({
    name: 'fk_recovery_offers_org_waitlist',
    columns: [table.organizationId, table.waitlistId],
    foreignColumns: [waitlist.organizationId, waitlist.waitlistId],
  }),
  foreignKey({
    name: 'fk_recovery_offers_org_appointment',
    columns: [table.organizationId, table.appointmentId],
    foreignColumns: [appointments.organizationId, appointments.appointmentId],
  }),
  foreignKey({
    name: 'fk_recovery_offers_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  // Performance indexes
  index('idx_recovery_offers_org_id').on(table.organizationId),
  index('idx_recovery_offers_org_status').on(table.organizationId, table.status),
  index('idx_recovery_offers_org_waitlist').on(table.organizationId, table.waitlistId),
  index('idx_recovery_offers_org_appointment').on(table.organizationId, table.appointmentId),
  index('idx_recovery_offers_expires_at').on(table.organizationId, table.expiresAt),
]);

// Inferred types for use in repositories and services
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
export type RecoveryOffer = typeof recoveryOffers.$inferSelect;
export type NewRecoveryOffer = typeof recoveryOffers.$inferInsert;
