import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { dentists } from '../types/schema';

export class DentistsRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(dentists)
      .where(and(eq(dentists.organizationId, organizationId), eq(dentists.dentistId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(dentists)
      .where(eq(dentists.organizationId, organizationId));
  }
}
