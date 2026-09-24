import { and, eq, ilike, or, desc } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { patients } from '../types/schema';
import { appointments } from '../../appointments/types/schema';

export class PatientsRepository {
  constructor(private readonly db: Database) { }

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.patientId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByPhone(organizationId: string, phone: string) {
    const clean = phone.replace(/\D/g, '');
    const last10 = clean.length >= 10 ? clean.slice(-10) : clean;

    const result = await this.db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.organizationId, organizationId),
          or(
            eq(patients.phone, phone),
            ilike(patients.phone, `%${clean}%`),
            ilike(patients.phone, `%${last10}%`)
          )
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(patients)
      .where(eq(patients.organizationId, organizationId));
  }

  async search(organizationId: string, query: string, offset: number, limit: number) {
    return this.db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.organizationId, organizationId),
          or(
            ilike(patients.firstName, `%${query}%`),
            ilike(patients.lastName, `%${query}%`),
            ilike(patients.phone, `%${query}%`)
          )
        )
      )
      .offset(offset)
      .limit(limit);
  }

  async create(data: typeof patients.$inferInsert) {
    const result = await this.db
      .insert(patients)
      .values(data)
      .returning();
    return result[0];
  }

  async update(organizationId: string, patientId: string, data: Partial<typeof patients.$inferInsert>) {
    const result = await this.db
      .update(patients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(patients.organizationId, organizationId), eq(patients.patientId, patientId)))
      .returning();
    return result[0];
  }

  async getPatientHistory(organizationId: string, patientId: string) {
    return this.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.organizationId, organizationId), eq(appointments.patientId, patientId)))
      .orderBy(desc(appointments.startAt));
  }
}
