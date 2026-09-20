import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { services } from '../types/schema';

export class ServicesRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(services)
      .where(and(eq(services.organizationId, organizationId), eq(services.serviceId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(services)
      .where(eq(services.organizationId, organizationId));
  }
  async create(data: typeof services.$inferInsert) {
    return this.db.insert(services).values(data).returning();
  }
}
