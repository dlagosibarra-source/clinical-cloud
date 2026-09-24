import { pgTable, uuid, integer, time, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';
import { dentists } from '../../dentists/types/schema';

export const dentistAvailability = pgTable('dentist_availability', {
  availabilityId: uuid('availability_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.organizationId),
  dentistId: uuid('dentist_id').notNull().references(() => dentists.dentistId),
  dayOfWeek: integer('day_of_week').notNull(), // 0 for Sunday, 1 for Monday, etc.
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
});

export const availabilityBlocks = pgTable('availability_blocks', {
  blockId: uuid('block_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.organizationId),
  dentistId: uuid('dentist_id').notNull().references(() => dentists.dentistId),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  reason: varchar('reason', { length: 255 }),
  isBlocked: boolean('is_blocked').default(true).notNull(),
});
