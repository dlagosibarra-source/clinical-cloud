import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from '../../organizations/types/schema';

export const services = pgTable('services', {
  serviceId: uuid('service_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('MXN'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_services_org_name').on(table.organizationId, table.name),
  unique('uq_services_org_service').on(table.organizationId, table.serviceId),
  index('idx_services_org_id').on(table.organizationId),
  check('ck_services_duration_positive', sql`${table.durationMinutes} > 0`),
  check('ck_services_price_non_negative', sql`${table.price} >= 0`),
]);
