import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';
import { locations } from '../../locations/types/schema';

export const resources = pgTable('resources', {
  resourceId: uuid('resource_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  locationId: uuid('location_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  resourceType: varchar('resource_type', { length: 20 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_resources_org_code').on(table.organizationId, table.code),
  unique('uq_resources_org_resource').on(table.organizationId, table.resourceId),
  index('idx_resources_org_id').on(table.organizationId),
  foreignKey({
    name: 'fk_resources_org_location',
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.locationId],
  }),
]);
