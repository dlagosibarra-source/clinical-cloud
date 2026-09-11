import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { users } from '../types/schema';

export class UsersRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.userId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }
}
