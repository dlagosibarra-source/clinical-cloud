import { eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { organizations } from '../types/schema';

export class OrganizationsRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.organizationId, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll() {
    return this.db.select().from(organizations);
  }
  async create(data: typeof organizations.$inferInsert) {
    return this.db.insert(organizations).values(data).returning();
  }
}
