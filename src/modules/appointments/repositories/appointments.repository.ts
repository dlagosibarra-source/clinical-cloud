import { and, eq, gte, lte, notInArray, desc } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { appointments, appointmentEvents } from '../types/schema';

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

  /**
   * Finds appointments for a specific dentist and date range.
   * By default, explicitly EXCLUDES 'CANCELLED' and 'RESCHEDULED' appointments
   * so that freed slots are accurately reported as available and can be rebooked.
   */
  async findByDentistAndDate(
    organizationId: string,
    dentistId: string,
    startAt: Date,
    endAt: Date,
    includeInactive = false
  ) {
    const conditions = [
      eq(appointments.organizationId, organizationId),
      eq(appointments.dentistId, dentistId),
      gte(appointments.startAt, startAt),
      lte(appointments.endAt, endAt),
    ];

    if (!includeInactive) {
      conditions.push(notInArray(appointments.status, ['CANCELLED', 'RESCHEDULED']));
    }

    return this.db
      .select()
      .from(appointments)
      .where(and(...conditions));
  }

  async updateStatus(organizationId: string, appointmentId: string, status: string) {
    return this.db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(appointments.organizationId, organizationId), eq(appointments.appointmentId, appointmentId)))
      .returning();
  }

  /**
   * Append-only event creation for appointment lifecycle tracking and auditability.
   */
  async createEvent(data: typeof appointmentEvents.$inferInsert) {
    return this.db.insert(appointmentEvents).values(data).returning();
  }

  /**
   * Retrieves chronological event history for an appointment.
   */
  async findEventsByAppointment(organizationId: string, appointmentId: string) {
    return this.db
      .select()
      .from(appointmentEvents)
      .where(
        and(
          eq(appointmentEvents.organizationId, organizationId),
          eq(appointmentEvents.appointmentId, appointmentId)
        )
      )
      .orderBy(desc(appointmentEvents.createdAt));
  }
}
