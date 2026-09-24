import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';

export const locations = pgTable('locations', {
  locationId: uuid('location_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  countryCode: varchar('country_code', { length: 10 }),
  timezone: varchar('timezone', { length: 100 }).default('America/Mexico_City'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_locations_org_code').on(table.organizationId, table.code),
  unique('uq_locations_org_location').on(table.organizationId, table.locationId),
  index('idx_locations_org_id').on(table.organizationId),
]);
