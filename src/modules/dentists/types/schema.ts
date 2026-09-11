import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';
import { users } from '../../users/types/schema';

export const dentists = pgTable('dentists', {
  dentistId: uuid('dentist_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  userId: uuid('user_id'),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  professionalName: varchar('professional_name', { length: 200 }),
  licenseNumber: varchar('license_number', { length: 50 }),
  specialty: varchar('specialty', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_dentists_org_dentist').on(table.organizationId, table.dentistId),
  index('idx_dentists_org_id').on(table.organizationId),
  foreignKey({
    name: 'fk_dentists_org_user',
    columns: [table.organizationId, table.userId],
    foreignColumns: [users.organizationId, users.userId],
  }),
]);
