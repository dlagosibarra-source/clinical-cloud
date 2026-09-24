import { eq, and, gte, lt } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { dentistAvailability, availabilityBlocks } from '../types/schema';

export class AvailabilityRepository {
  constructor(private readonly db: Database) {}

  async getAvailabilityForDay(organizationId: string, dentistId: string, dayOfWeek: number) {
    return this.db
      .select()
      .from(dentistAvailability)
      .where(and(
        eq(dentistAvailability.organizationId, organizationId),
        eq(dentistAvailability.dentistId, dentistId),
        eq(dentistAvailability.dayOfWeek, dayOfWeek)
      ));
  }

  async getAvailabilityBlocks(organizationId: string, dentistId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.db.select()
      .from(availabilityBlocks)
      .where(and(
        eq(availabilityBlocks.organizationId, organizationId),
        eq(availabilityBlocks.dentistId, dentistId),
        gte(availabilityBlocks.startAt, startOfDay),
        lt(availabilityBlocks.endAt, endOfDay)
      ));
  }
}