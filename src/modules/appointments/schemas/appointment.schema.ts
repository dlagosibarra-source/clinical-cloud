import { z } from "zod";

export const CreateAppointmentSchema = z
  .object({
    patient_id: z.string().uuid({ message: "patient_id must be a valid UUID" }).optional(),
    patientId: z.string().uuid({ message: "patientId must be a valid UUID" }).optional(),
    dentist_id: z.string().uuid({ message: "dentist_id must be a valid UUID" }).optional(),
    dentistId: z.string().uuid({ message: "dentistId must be a valid UUID" }).optional(),
    location_id: z.string().uuid({ message: "location_id must be a valid UUID" }).optional(),
    locationId: z.string().uuid({ message: "locationId must be a valid UUID" }).optional(),
    service_id: z.string().uuid({ message: "service_id must be a valid UUID" }).optional(),
    serviceId: z.string().uuid({ message: "serviceId must be a valid UUID" }).optional(),
    start_at: z
      .union([
        z
          .string()
          .refine((val) => !isNaN(Date.parse(val)), {
            message: "Invalid start_at date format",
          })
          .transform((val) => new Date(val)),
        z.date(),
      ])
      .optional(),
    startAt: z
      .union([
        z
          .string()
          .refine((val) => !isNaN(Date.parse(val)), {
            message: "Invalid startAt date format",
          })
          .transform((val) => new Date(val)),
        z.date(),
      ])
      .optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    timezone: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.patient_id && !data.patientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "patient_id is required",
        path: ["patient_id"],
      });
    }
    if (!data.dentist_id && !data.dentistId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dentist_id is required",
        path: ["dentist_id"],
      });
    }
    if (!data.location_id && !data.locationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "location_id is required",
        path: ["location_id"],
      });
    }
    if (!data.service_id && !data.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "service_id is required",
        path: ["service_id"],
      });
    }
    const hasStart = Boolean(data.start_at || data.startAt);
    const hasDateTime = Boolean(data.date && data.time);
    if (!hasStart && !hasDateTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start_at or both (date and time) are required",
        path: ["start_at"],
      });
    }
  })
  .transform((data) => {
    const patientId = (data.patient_id || data.patientId)!;
    const dentistId = (data.dentist_id || data.dentistId)!;
    const locationId = (data.location_id || data.locationId)!;
    const serviceId = (data.service_id || data.serviceId)!;
    const startAt = (data.start_at || data.startAt);

    return {
      patientId,
      dentistId,
      locationId,
      serviceId,
      startAt,
      date: data.date,
      time: data.time,
      timezone: data.timezone,
      patient_id: patientId,
      dentist_id: dentistId,
      location_id: locationId,
      service_id: serviceId,
      start_at: startAt,
      notes: data.notes,
    };
  });
