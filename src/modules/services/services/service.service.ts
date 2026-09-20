import { type Database } from '../../../shared/database';
import { ServicesRepository } from '../repositories/services.repository';
import { type AuthContext } from '../../../shared/types';
import { type services } from '../types/schema';

export class ServiceService {
    private repository: ServicesRepository;

    constructor(private readonly db: Database) {
        this.repository = new ServicesRepository(db);
    }

    async createService(context: AuthContext, data: Omit<typeof services.$inferInsert, 'organizationId' | 'serviceId' | 'createdAt' | 'updatedAt'>) {
        return this.repository.create({
            ...data,
            organizationId: context.organization_id,
        });
    }

    async getServiceById(context: AuthContext, id: string) {
        return this.repository.findById(context.organization_id, id);
    }
}