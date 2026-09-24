import { type Database } from '../../../shared/database';
import { PatientsRepository } from '../repositories/patients.repository';
import { type AuthContext } from '../../../shared/types/index';
import { type patients } from '../types/schema';

export class PatientService {
  private repository: PatientsRepository;

  constructor(private readonly db: Database) {
    this.repository = new PatientsRepository(db);
  }

  async createPatient(context: AuthContext, data: Omit<typeof patients.$inferInsert, 'organizationId' | 'patientId' | 'createdAt' | 'updatedAt'>) {
    return this.repository.create({
      ...data,
      organizationId: context.organization_id,
    });
  }

  async updatePatient(context: AuthContext, patientId: string, data: Partial<Omit<typeof patients.$inferInsert, 'organizationId' | 'patientId' | 'createdAt' | 'updatedAt'>>) {
    return this.repository.update(context.organization_id, patientId, data);
  }

  async searchPatients(context: AuthContext, query: string, page: number, limit: number) {
    return this.repository.search(
      context.organization_id,
      query,
      (page - 1) * limit,
      limit
    );
  }

  async getPatientHistory(context: AuthContext, patientId: string) {
    return this.repository.getPatientHistory(context.organization_id, patientId);
  }

  async getById(context: AuthContext, patientId: string) {
    return this.repository.findById(context.organization_id, patientId);
  }

  async getByPhone(context: AuthContext, phone: string) {
    return this.repository.findByPhone(context.organization_id, phone);
  }

  async getPatients(context: AuthContext) {
    return this.repository.findAll(context.organization_id);
  }
}