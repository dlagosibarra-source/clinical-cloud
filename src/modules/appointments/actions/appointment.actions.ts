"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../shared/database";
import { getAuthenticatedContext } from "../../../shared/auth/context";
import { AppointmentService } from "../services/appointment.service";
import { CreateAppointmentSchema } from "../schemas/appointment.schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { schema } from "../../../shared/database";
import { getLocalDayBounds, localToUtc, parseLocalDateTime } from "../../../shared/utils/date-time";
import type {
    AgendaAppointment,
    AgendaDentist,
    AgendaLocation,
    AppointmentStatus,
} from "../../agenda/types";

export async function createAppointmentAction(rawData: unknown) {
    const context = getAuthenticatedContext();

    const validated = CreateAppointmentSchema.safeParse(rawData);
    if (!validated.success) {
        const fieldErrors = validated.error.flatten().fieldErrors;
        const details = Object.entries(fieldErrors)
            .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
            .join("; ");
        return {
            success: false,
            status: 400,
            error: `Invalid input data: ${details}`,
            details: validated.error.flatten(),
        };
    }

    const appointmentData = validated.data;
    const appointmentService = new AppointmentService(db);

    try {
        // Fetch location to get its configured timezone
        const locationRecord = await db
            .select({ timezone: schema.locations.timezone })
            .from(schema.locations)
            .where(
                and(
                    eq(schema.locations.organizationId, context.organization_id),
                    eq(schema.locations.locationId, appointmentData.locationId)
                )
            )
            .limit(1)
            .then((res) => res[0]);

        const branchTimezone = locationRecord?.timezone || appointmentData.timezone || "America/Mexico_City";

        let calculatedStartAt: Date;
        if (appointmentData.date && appointmentData.time) {
            calculatedStartAt = localToUtc(appointmentData.date, appointmentData.time, branchTimezone);
        } else if (typeof (rawData as Record<string, unknown>)?.start_at === "string" || typeof (rawData as Record<string, unknown>)?.startAt === "string") {
            const rawString = String((rawData as Record<string, unknown>)?.start_at || (rawData as Record<string, unknown>)?.startAt);
            calculatedStartAt = parseLocalDateTime(rawString, branchTimezone);
        } else if (appointmentData.startAt) {
            calculatedStartAt = appointmentData.startAt;
        } else {
            calculatedStartAt = new Date();
        }

        const newAppointmentResult = await appointmentService.createAppointment(
            context,
            {
                ...appointmentData,
                startAt: calculatedStartAt,
            }
        );

        const firstCreated = newAppointmentResult[0];
        if (!firstCreated) {
            throw new Error("Failed to create appointment: no data returned");
        }

        safeRevalidatePath("/agenda");
        safeRevalidatePath("/pacientes");
        if (firstCreated.patientId) {
            safeRevalidatePath(`/pacientes/${firstCreated.patientId}`);
        }

        return {
            success: true,
            status: 201,
            data: firstCreated,
        };
    } catch (error: unknown) {
        console.error("Error creating appointment:", error);
        if (error instanceof Error && error.message === "Appointment overlaps with an existing appointment or block") {
            return {
                success: false,
                status: 409, // Conflict
                error: error.message,
            };
        }
        if (error instanceof Error && error.message === "Service not found") {
            return {
                success: false,
                status: 404, // Not Found
                error: error.message,
            };
        }
        return {
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create appointment",
        };
    }
}

export async function getAgendaAppointmentsAction(date: string, locationId?: string) {
    const context = getAuthenticatedContext();

    try {
        // Fetch dentists and locations for the active organization
        const orgDentists = await db
            .select()
            .from(schema.dentists)
            .where(eq(schema.dentists.organizationId, context.organization_id));

        const orgLocations = await db
            .select()
            .from(schema.locations)
            .where(eq(schema.locations.organizationId, context.organization_id));

        const activeLocation = locationId && locationId !== "ALL"
            ? orgLocations.find((l) => l.locationId === locationId)
            : orgLocations[0];

        const activeTimezone = activeLocation?.timezone || "America/Mexico_City";
        const { startOfDay, endOfDay } = getLocalDayBounds(date, activeTimezone);

        // Fetch appointments with patient, dentist, service, and location
        const rows = await db
            .select({
                appointment: schema.appointments,
                patient: schema.patients,
                dentist: schema.dentists,
                service: schema.services,
                location: schema.locations,
            })
            .from(schema.appointments)
            .innerJoin(
                schema.patients,
                and(
                    eq(schema.appointments.patientId, schema.patients.patientId),
                    eq(schema.appointments.organizationId, schema.patients.organizationId)
                )
            )
            .innerJoin(
                schema.dentists,
                and(
                    eq(schema.appointments.dentistId, schema.dentists.dentistId),
                    eq(schema.appointments.organizationId, schema.dentists.organizationId)
                )
            )
            .innerJoin(
                schema.services,
                and(
                    eq(schema.appointments.serviceId, schema.services.serviceId),
                    eq(schema.appointments.organizationId, schema.services.organizationId)
                )
            )
            .innerJoin(
                schema.locations,
                and(
                    eq(schema.appointments.locationId, schema.locations.locationId),
                    eq(schema.appointments.organizationId, schema.locations.organizationId)
                )
            )
            .where(
                and(
                    eq(schema.appointments.organizationId, context.organization_id),
                    gte(schema.appointments.startAt, startOfDay),
                    lte(schema.appointments.startAt, endOfDay)
                )
            )
            .orderBy(asc(schema.appointments.startAt));

        const mappedAppointments: AgendaAppointment[] = rows.map(
            ({ appointment, patient, dentist, service, location }) => ({
                appointmentId: appointment.appointmentId,
                patientId: appointment.patientId,
                patient: {
                    patientId: patient.patientId,
                    firstName: patient.firstName,
                    lastName: patient.lastName,
                    phone: patient.phone,
                    email: patient.email,
                    whatsappOptIn: patient.whatsappOptIn,
                },
                dentistId: appointment.dentistId,
                dentist: {
                    dentistId: dentist.dentistId,
                    firstName: dentist.firstName,
                    lastName: dentist.lastName,
                    professionalName: dentist.professionalName,
                    specialty: dentist.specialty,
                    color: "#0891b2",
                },
                locationId: appointment.locationId,
                location: {
                    locationId: location.locationId,
                    name: location.name,
                    code: location.code,
                    address: location.address,
                    city: location.city,
                    timezone: location.timezone,
                },
                serviceId: appointment.serviceId,
                service: {
                    serviceId: service.serviceId,
                    name: service.name,
                    durationMinutes: service.durationMinutes,
                    price: service.price,
                    currency: service.currency,
                },
                startAt: appointment.startAt.toISOString(),
                endAt: appointment.endAt.toISOString(),
                durationMinutes:
                    appointment.serviceDurationSnapshot || service.durationMinutes,
                status: appointment.status as AppointmentStatus,
                notes: appointment.notes,
                serviceNameSnapshot: appointment.serviceNameSnapshot,
                serviceDurationSnapshot: appointment.serviceDurationSnapshot,
                serviceValueSnapshot: appointment.serviceValueSnapshot,
            })
        );

        const mappedDentists: AgendaDentist[] = orgDentists.map((d) => ({
            dentistId: d.dentistId,
            firstName: d.firstName,
            lastName: d.lastName,
            professionalName: d.professionalName,
            specialty: d.specialty,
            color: "#0891b2",
        }));

        const mappedLocations: AgendaLocation[] = orgLocations.map((l) => ({
            locationId: l.locationId,
            name: l.name,
            code: l.code,
            address: l.address,
            city: l.city,
            timezone: l.timezone,
        }));

        return {
            success: true,
            status: 200,
            data: mappedAppointments,
            dentists: mappedDentists,
            locations: mappedLocations,
        };
    } catch (error: unknown) {
        console.error("Error fetching agenda appointments:", error);
        return {
            success: false,
            status: 500,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch agenda appointments",
            data: [],
            dentists: [],
            locations: [],
        };
    }
}

function safeRevalidatePath(path: string) {
    try {
        revalidatePath(path);
    } catch {
        // Gracefully ignore when invoked outside Next.js request context (e.g. testing / scripts)
    }
}

export async function updateAppointmentStatusAction(
    appointmentId: string,
    status: AppointmentStatus
) {
    const context = getAuthenticatedContext();
    const appointmentService = new AppointmentService(db);

    try {
        const result = await appointmentService.updateAppointmentStatus(
            context,
            appointmentId,
            status
        );
        const updated = result[0];
        if (!updated) {
            return {
                success: false,
                status: 404,
                error: "Cita no encontrada",
            };
        }

        // Critical: Revalidate paths to purge Next.js server cache
        safeRevalidatePath("/agenda");
        safeRevalidatePath("/pacientes");
        if (updated.patientId) {
            safeRevalidatePath(`/pacientes/${updated.patientId}`);
        }

        return {
            success: true,
            status: 200,
            data: {
                appointmentId: updated.appointmentId,
                status: updated.status as AppointmentStatus,
            },
        };
    } catch (error: unknown) {
        console.error("Error updating appointment status:", error);
        return {
            success: false,
            status: 500,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al actualizar estado de la cita",
        };
    }
}
