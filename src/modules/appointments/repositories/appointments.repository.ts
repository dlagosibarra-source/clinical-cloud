import { and, eq, gte, lte } from 'drizzle-orm';
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

  async findByDentistAndDate(organizationId: string, dentistId: string, startAt: Date, endAt: Date) {
    return this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.dentistId, dentistId),
          gte(appointments.startAt, startAt),
          lte(appointments.endAt, endAt)
        )
      );
  }

  async updateStatus(organizationId: string, appointmentId: string, status: string) {
    return this.db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(appointments.organizationId, organizationId), eq(appointments.appointmentId, appointmentId)))
      .returning();
  }
}
