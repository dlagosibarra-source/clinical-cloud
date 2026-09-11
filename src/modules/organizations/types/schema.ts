import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  organizationId: uuid('organization_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  countryCode: varchar('country_code', { length: 10 }),
  timezone: varchar('timezone', { length: 100 }).notNull().default('America/Mexico_City'),
  currency: varchar('currency', { length: 3 }).notNull().default('MXN'),
  status: varchar('status', { length: 20 }).notNull().default('TRIAL'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
