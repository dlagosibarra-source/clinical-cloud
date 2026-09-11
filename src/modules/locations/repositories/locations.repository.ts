import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { locations } from '../types/schema';

export class LocationsRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.organizationId, organizationId), eq(locations.locationId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(locations)
      .where(eq(locations.organizationId, organizationId));
  }
}
