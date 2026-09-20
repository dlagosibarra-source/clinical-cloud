import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { appointments } from '../types/schema';

export class AppointmentsRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.organizationId, organizationId), eq(appointments.appointmentId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(appointments)
      .where(eq(appointments.organizationId, organizationId));
  }
  async create(data: typeof appointments.$inferInsert) {
    return this.db.insert(appointments).values(data).returning();
  }
}
