"use server";

import { db } from "../../../shared/database";
import { getAuthenticatedContext } from "../../../shared/auth/context";
import { AvailabilityService } from "../services/availability.service";
import { GetAvailabilityQuerySchema } from "../schemas/availability.schema";

export async function getAvailableSlotsAction(rawData: unknown) {
    const context = getAuthenticatedContext();
    
    const validated = GetAvailabilityQuerySchema.safeParse(rawData);
    if (!validated.success) {
        return {
            success: false,
            error: "Invalid input data",
            details: validated.error.flatten(),
        };
    }

    const { dentistId, serviceId, date } = validated.data;
    const availabilityService = new AvailabilityService(db);

    try {
        const result = await availabilityService.getAvailableSlots(
            context,
            dentistId,
            new Date(date),
            serviceId
        );

        return {
            success: true,
            data: result,
        };
    } catch (error: unknown) {
        console.error("Error in getAvailableSlotsAction:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch availability",
        };
    }
}
