import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { patients } from '../types/schema';

export class PatientsRepository {
  constructor(private readonly db: Database) {}

  async findById(organizationId: string, id: string) {
    const result = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.patientId, id)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(patients)
      .where(eq(patients.organizationId, organizationId));
  }
}
