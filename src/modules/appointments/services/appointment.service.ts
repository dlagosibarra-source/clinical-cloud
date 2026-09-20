import { type Database } from '../../../shared/database';
import { AppointmentsRepository } from '../repositories/appointments.repository';
import { ServiceService } from '../../services/services/service.service';
import { type AuthContext } from '../../../shared/types';
import { type appointments } from '../types/schema';

export class AppointmentService {
    private repository: AppointmentsRepository;
    private serviceService: ServiceService;

    constructor(private readonly db: Database) {
        this.repository = new AppointmentsRepository(db);
        this.serviceService = new ServiceService(db);
    }

    async createAppointment(context: AuthContext, data: Omit<typeof appointments.$inferInsert, 'organizationId' | 'appointmentId' | 'createdAt' | 'updatedAt' | 'serviceNameSnapshot' | 'serviceDurationSnapshot' | 'serviceValueSnapshot' | 'createdByUserId' | 'endAt'> & { endAt?: Date, serviceId: string }) {
        const service = await this.serviceService.getServiceById(context, data.serviceId);
        
        if (!service) {
            throw new Error('Service not found');
        }

        let endAt = data.endAt;
        if (!endAt) {
            endAt = new Date(data.startAt.getTime() + service.durationMinutes * 60000);
        }

        try {
            return await this.repository.create({
                ...data,
                endAt,
                organizationId: context.organization_id,
                createdByUserId: context.user_id,
                serviceNameSnapshot: service.name,
                serviceDurationSnapshot: service.durationMinutes,
                serviceValueSnapshot: service.price,
            });
        } catch (error) {
            // Check for exclusion constraint violation or similar DB errors
            throw new Error('Horario no disponible');
        }
    }
}