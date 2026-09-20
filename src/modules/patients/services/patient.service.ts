import { type Database } from '../../../shared/database';
import { PatientsRepository } from '../repositories/patients.repository';
import { type AuthContext } from '../../../shared/types';

export class PatientService {
    private repository: PatientsRepository;

    constructor(private readonly db: Database) {
        this.repository = new PatientsRepository(db);
    }

    async createPatient(context: AuthContext, data: { firstName: string; lastName: string; phone?: string; email?: string }) {
        // The organization_id is extracted from the context, NOT from the data
        return this.repository.create({
            ...data,
            organizationId: context.organization_id,
        });
    }

    async getPatients(context: AuthContext) {
        return this.repository.findAll(context.organization_id);
    }
}