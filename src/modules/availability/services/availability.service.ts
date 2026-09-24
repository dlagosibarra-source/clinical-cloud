import { type Database } from '../../../shared/database';
import { AvailabilityRepository } from '../repositories/availability.repository';
import { AppointmentsRepository } from '../../appointments/repositories/appointments.repository';
import { ServiceService } from '../../services/services/service.service'; // Import ServiceService
import { type AuthContext } from '../../../shared/types/index';

// Helper functions for time parsing and formatting
function parseTime(date: Date, timeString: string): Date {
    const [hours = 0, minutes = 0] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export class AvailabilityService {
    private availabilityRepository: AvailabilityRepository;
    private appointmentsRepository: AppointmentsRepository;
    private serviceService: ServiceService; // Declare ServiceService

    constructor(private readonly db: Database) {
        this.availabilityRepository = new AvailabilityRepository(db);
        this.appointmentsRepository = new AppointmentsRepository(db);
        this.serviceService = new ServiceService(db); // Initialize ServiceService
    }

    async getAvailableSlots(context: AuthContext, dentistId: string, date: Date, serviceId: string) {
        const dayOfWeek = date.getDay();

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get service duration
        const service = await this.serviceService.getServiceById(context, serviceId);
        if (!service) {
            throw new Error('Service not found');
        }
        const slotDurationMinutes = service.durationMinutes;

        // 1. Get recurring availability
        const recurring = await this.availabilityRepository.getAvailabilityForDay(context.organization_id, dentistId, dayOfWeek);

        // 2. Get availability blocks (exceptions)
        const blocks = await this.availabilityRepository.getAvailabilityBlocks(context.organization_id, dentistId, date);

        // 3. Get existing appointments for the day
        const appointments = await this.appointmentsRepository.findByDentistAndDate(
            context.organization_id,
            dentistId,
            startOfDay,
            endOfDay
        );

        const availableWindows = recurring.map(r => ({
            start: parseTime(date, r.startTime),
            end: parseTime(date, r.endTime)
        }));

        const occupiedIntervals = [
            ...blocks.map(b => ({ start: b.startAt, end: b.endAt })),
            ...appointments.map(a => ({ start: a.startAt, end: a.endAt }))
        ];

        const availableSlots: string[] = [];

        for (const window of availableWindows) {
            let currentSlotStart = window.start;

            while (currentSlotStart.getTime() + slotDurationMinutes * 60000 <= window.end.getTime()) {
                const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMinutes * 60000);

                const isOccupied = occupiedIntervals.some(occupied => {
                    // Check for overlap: [start1, end1) and [start2, end2)
                    return (currentSlotStart < occupied.end && occupied.start < currentSlotEnd);
                });

                if (!isOccupied) {
                    availableSlots.push(formatTime(currentSlotStart));
                }
                currentSlotStart = new Date(currentSlotStart.getTime() + slotDurationMinutes * 60000); // Move to next potential slot
            }
        }

        return {
            date: date.toISOString().split('T')[0],
            availableWindows: recurring.map(r => ({ start: r.startTime, end: r.endTime })), // Keep original format for windows
            occupiedIntervals,
            slots: availableSlots,
            hasAvailability: availableSlots.length > 0
        };
    }
}
