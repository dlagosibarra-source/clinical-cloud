import { z } from "zod";

export const GetAvailabilityQuerySchema = z.object({
    dentistId: z.string().uuid(),
    serviceId: z.string().uuid(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
});
