import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { resources } from '../types/schema';

export class ResourcesRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(resources)
      .where(and(eq(resources.organizationId, organizationId), eq(resources.resourceId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(resources)
      .where(eq(resources.organizationId, organizationId));
  }
}
