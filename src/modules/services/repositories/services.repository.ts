import { and, eq, ilike, or, asc } from 'drizzle-orm';
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

  async findAll(organizationId: string, query?: string, status?: string) {
    const conditions = [eq(services.organizationId, organizationId)];

    if (status && status !== 'ALL') {
      conditions.push(eq(services.status, status));
    }

    if (query && query.trim()) {
      const search = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(services.name, search),
          ilike(services.description, search)
        )!
      );
    }

    return this.db
      .select()
      .from(services)
      .where(and(...conditions))
      .orderBy(asc(services.name));
  }

  async create(data: typeof services.$inferInsert) {
    return this.db.insert(services).values(data).returning();
  }

  async update(organizationId: string, id: string, data: Partial<typeof services.$inferInsert>) {
    return this.db
      .update(services)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(services.organizationId, organizationId), eq(services.serviceId, id)))
      .returning();
  }

  async delete(organizationId: string, id: string) {
    // Soft-delete by setting status to INACTIVE
    return this.db
      .update(services)
      .set({ status: 'INACTIVE', updatedAt: new Date() })
      .where(and(eq(services.organizationId, organizationId), eq(services.serviceId, id)))
      .returning();
  }
}
