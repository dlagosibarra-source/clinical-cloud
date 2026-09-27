import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { AppointmentsRepository } from '../repositories/appointments.repository';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository';
import { ServiceService } from '../../services/services/service.service';
import { type AuthContext } from '../../../shared/types/index';
import { appointments, appointmentEvents } from '../types/schema';

export interface AppointmentEventOptions {
    actorType?: 'USER' | 'SYSTEM' | 'AI' | 'PATIENT' | 'INTEGRATION';
    source?: 'WEB' | 'MOBILE' | 'WHATSAPP' | 'API' | 'SYSTEM' | 'ADMIN';
    reason?: string;
    metadata?: Record<string, unknown>;
}

export class AppointmentService {
    private repository: AppointmentsRepository;
    private availabilityRepository: AvailabilityRepository;
    private serviceService: ServiceService;

    constructor(private readonly db: Database) {
        this.repository = new AppointmentsRepository(db);
        this.availabilityRepository = new AvailabilityRepository(db);
        this.serviceService = new ServiceService(db);
    }

    async createAppointment(
        context: AuthContext,
        data: Omit<typeof appointments.$inferInsert, 'organizationId' | 'appointmentId' | 'createdAt' | 'updatedAt' | 'serviceNameSnapshot' | 'serviceDurationSnapshot' | 'serviceValueSnapshot' | 'createdByUserId' | 'endAt'> & { endAt?: Date, serviceId: string },
        options?: AppointmentEventOptions
    ) {
        const service = await this.serviceService.getServiceById(context, data.serviceId);
        
        if (!service) {
            throw new Error('Service not found');
        }

        const finalEndAt = data.endAt ?? new Date(data.startAt.getTime() + service.durationMinutes * 60000);

        // --- Pre-insertion Overlap Validation (Excludes CANCELLED/RESCHEDULED) ---
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
            return await this.db.transaction(async (tx) => {
                const createdRows = await tx.insert(appointments).values({
                    ...data,
                    endAt: finalEndAt,
                    organizationId: context.organization_id,
                    createdByUserId: context.user_id,
                    serviceNameSnapshot: service.name,
                    serviceDurationSnapshot: service.durationMinutes,
                    serviceValueSnapshot: service.price,
                }).returning();

                const created = createdRows[0];
                if (created) {
                    // Record immutable CREATED event in appointment_events
                    await tx.insert(appointmentEvents).values({
                        organizationId: context.organization_id,
                        appointmentId: created.appointmentId,
                        eventType: 'CREATED',
                        actorType: options?.actorType || 'USER',
                        actorUserId: context.user_id,
                        source: options?.source || 'WEB',
                        metadata: {
                            serviceName: service.name,
                            durationMinutes: service.durationMinutes,
                            price: service.price,
                            ...options?.metadata,
                        },
                    });
                }

                return createdRows;
            });
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error && typeof (error as { code: string }).code === 'string' && (error as { code: string }).code === '23P01') {
                throw new Error('Horario no disponible');
            }
            throw error;
        }
    }

    async updateAppointmentStatus(
        context: AuthContext,
        appointmentId: string,
        status: string,
        options?: AppointmentEventOptions
    ) {
        return await this.db.transaction(async (tx) => {
            const currentRows = await tx
                .select()
                .from(appointments)
                .where(and(eq(appointments.organizationId, context.organization_id), eq(appointments.appointmentId, appointmentId)))
                .limit(1);

            const existingApt = currentRows[0];
            if (!existingApt) {
                return [];
            }

            const updatedRows = await tx
                .update(appointments)
                .set({ status, updatedAt: new Date() })
                .where(and(eq(appointments.organizationId, context.organization_id), eq(appointments.appointmentId, appointmentId)))
                .returning();

            const updated = updatedRows[0];
            if (updated) {
                const eventType = status.toUpperCase();

                // 1. Record lifecycle milestone event (CONFIRMED, CANCELLED, COMPLETED, NO_SHOW, RESCHEDULED)
                await tx.insert(appointmentEvents).values({
                    organizationId: context.organization_id,
                    appointmentId: updated.appointmentId,
                    eventType,
                    actorType: options?.actorType || 'USER',
                    actorUserId: context.user_id,
                    source: options?.source || 'WEB',
                    metadata: {
                        previousStatus: existingApt.status,
                        newStatus: status,
                        reason: options?.reason,
                        ...options?.metadata,
                    },
                });

                // 2. If status is CANCELLED, atomically record RECOVERY_TRIGGERED event ready for Recovery Engine
                if (status === 'CANCELLED') {
                    await tx.insert(appointmentEvents).values({
                        organizationId: context.organization_id,
                        appointmentId: updated.appointmentId,
                        eventType: 'RECOVERY_TRIGGERED',
                        actorType: 'SYSTEM',
                        actorUserId: null,
                        source: 'SYSTEM',
                        metadata: {
                            triggeredByCancellationOf: updated.appointmentId,
                            freedSlot: {
                                startAt: updated.startAt.toISOString(),
                                endAt: updated.endAt.toISOString(),
                                dentistId: updated.dentistId,
                                locationId: updated.locationId,
                                serviceId: updated.serviceId,
                            },
                        },
                    });
                }
            }

            return updatedRows;
        });
    }

    /**
     * Retrieves event trail for an appointment.
     */
    async getAppointmentEvents(context: AuthContext, appointmentId: string) {
        return this.repository.findEventsByAppointment(context.organization_id, appointmentId);
    }
}