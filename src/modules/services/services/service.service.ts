import { type Database } from '../../../shared/database';
import { ServicesRepository } from '../repositories/services.repository';
import { type AuthContext } from '../../../shared/types/index';
import { type services } from '../types/schema';

export class ServiceService {
    private repository: ServicesRepository;

    constructor(private readonly db: Database) {
        this.repository = new ServicesRepository(db);
    }

    async getServices(context: AuthContext, query?: string, status?: string) {
        return this.repository.findAll(context.organization_id, query, status);
    }

    async getServiceById(context: AuthContext, id: string) {
        return this.repository.findById(context.organization_id, id);
    }

    async createService(
        context: AuthContext,
        data: Omit<typeof services.$inferInsert, 'organizationId' | 'serviceId' | 'createdAt' | 'updatedAt'>
    ) {
        return this.repository.create({
            ...data,
            organizationId: context.organization_id,
        });
    }

    async updateService(
        context: AuthContext,
        id: string,
        data: Partial<Omit<typeof services.$inferInsert, 'organizationId' | 'serviceId' | 'createdAt' | 'updatedAt'>>
    ) {
        return this.repository.update(context.organization_id, id, data);
    }

    async deleteService(context: AuthContext, id: string) {
        return this.repository.delete(context.organization_id, id);
    }
}