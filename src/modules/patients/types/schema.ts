import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  date,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';

export const patients = pgTable('patients', {
  patientId: uuid('patient_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  whatsappOptIn: boolean('whatsapp_opt_in').notNull().default(false),
  whatsappOptInAt: timestamp('whatsapp_opt_in_at', { withTimezone: true }),
  whatsappOptOutAt: timestamp('whatsapp_opt_out_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_patients_org_patient').on(table.organizationId, table.patientId),
  index('idx_patients_org_id').on(table.organizationId),
  index('idx_patients_org_phone').on(table.organizationId, table.phone),
  index('idx_patients_org_name').on(table.organizationId, table.lastName, table.firstName),
]);
