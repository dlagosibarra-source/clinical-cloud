import { type Database } from '../../../shared/database';
import { AppointmentsRepository } from '../repositories/appointments.repository';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository';
import { ServiceService } from '../../services/services/service.service';
import { type AuthContext } from '../../../shared/types/index';
import { type appointments } from '../types/schema';

export class AppointmentService {
    private repository: AppointmentsRepository;
    private availabilityRepository: AvailabilityRepository;
    private serviceService: ServiceService;

    constructor(private readonly db: Database) {
        this.repository = new AppointmentsRepository(db);
        this.availabilityRepository = new AvailabilityRepository(db);
        this.serviceService = new ServiceService(db);
    }

    async createAppointment(context: AuthContext, data: Omit<typeof appointments.$inferInsert, 'organizationId' | 'appointmentId' | 'createdAt' | 'updatedAt' | 'serviceNameSnapshot' | 'serviceDurationSnapshot' | 'serviceValueSnapshot' | 'createdByUserId' | 'endAt'> & { endAt?: Date, serviceId: string }) {
        const service = await this.serviceService.getServiceById(context, data.serviceId);
        
        if (!service) {
            throw new Error('Service not found');
        }

        const finalEndAt = data.endAt ?? new Date(data.startAt.getTime() + service.durationMinutes * 60000);

        // --- Pre-insertion Overlap Validation ---
        const existingAppointments = await this.repository.findByDentistAndDate(
            context.organization_id,
            data.dentistId,
            data.startAt,
            finalEndAt
        );

        const availabilityBlocks = await this.availabilityRepository.getAvailabilityBlocks(
            context.organization_id,
            data.dentistId,
            data.startAt
        );

        const allOccupiedIntervals = [
            ...existingAppointments.map(a => ({ start: a.startAt, end: a.endAt })),
            ...availabilityBlocks.map(b => ({ start: b.startAt, end: b.endAt }))
        ];

        const newAppointmentStart = data.startAt;
        const newAppointmentEnd = finalEndAt;

        const overlaps = allOccupiedIntervals.some(occupied => {
            return (newAppointmentStart < occupied.end && occupied.start < newAppointmentEnd);
        });

        if (overlaps) {
            throw new Error('Appointment overlaps with an existing appointment or block');
        }
        // --- End Pre-insertion Overlap Validation ---

        try {
            return await this.repository.create({
                ...data,
                endAt: finalEndAt,
                organizationId: context.organization_id,
                createdByUserId: context.user_id,
                serviceNameSnapshot: service.name,
                serviceDurationSnapshot: service.durationMinutes,
                serviceValueSnapshot: service.price,
            });
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error && typeof (error as { code: string }).code === 'string' && (error as { code: string }).code === '23P01') {
                throw new Error('Horario no disponible');
            }
            throw error;
        }
    }

    async updateAppointmentStatus(context: AuthContext, appointmentId: string, status: string) {
        return this.repository.updateStatus(context.organization_id, appointmentId, status);
    }
}