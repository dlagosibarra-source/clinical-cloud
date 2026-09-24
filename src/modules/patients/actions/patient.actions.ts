"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../shared/database";
import { getAuthenticatedContext } from "../../../shared/auth/context";
import { PatientService } from "../services/patient.service";
import { CreatePatientSchema, UpdatePatientSchema, SearchPatientsQuerySchema } from "../schemas/patient.schema";
import { schema } from "../../../shared/database";

const patientService = new PatientService(db);

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when invoked outside Next.js request context (e.g. testing / scripts)
  }
}

export async function createPatientAction(input: unknown) {
  const context = getAuthenticatedContext();
  const validated = CreatePatientSchema.safeParse(input);
  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const errorDetails = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
      .join("; ");
    return {
      success: false,
      status: 400,
      error: `Datos inválidos: ${errorDetails}`,
      details: validated.error.flatten(),
    };
  }

  try {
    const dataToInsert = {
      ...validated.data,
      whatsappOptInAt: validated.data.whatsappOptIn ? new Date() : undefined,
    };
    const patient = await patientService.createPatient(context, dataToInsert);
    safeRevalidatePath("/pacientes");
    return { success: true, status: 201, data: patient };
  } catch (error) {
    console.error("Error creating patient:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al registrar paciente",
    };
  }
}

export async function updatePatientAction(patientId: string, input: unknown) {
  const context = getAuthenticatedContext();
  const validated = UpdatePatientSchema.safeParse(input);
  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const errorDetails = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
      .join("; ");
    return {
      success: false,
      status: 400,
      error: `Datos inválidos: ${errorDetails}`,
      details: validated.error.flatten(),
    };
  }

  try {
    const dataToUpdate: Partial<typeof schema.patients.$inferInsert> = {
      ...validated.data,
    };
    if (validated.data.whatsappOptIn === true) {
      dataToUpdate.whatsappOptInAt = new Date();
    } else if (validated.data.whatsappOptIn === false) {
      dataToUpdate.whatsappOptOutAt = new Date();
    }

    const patient = await patientService.updatePatient(context, patientId, dataToUpdate);
    if (!patient) return { success: false, status: 404, error: "Paciente no encontrado" };

    safeRevalidatePath("/pacientes");
    safeRevalidatePath(`/pacientes/${patientId}`);
    return { success: true, status: 200, data: patient };
  } catch (error) {
    console.error("Error updating patient:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al actualizar paciente",
    };
  }
}

import { and, eq, or, ilike, desc, sql } from "drizzle-orm";
import type { PatientListItem, PatientHistoryItem, PatientProfileData } from "../types";
import type { AppointmentStatus } from "../../agenda/types";

export async function searchPatientsAction(input: unknown) {
  const context = getAuthenticatedContext();
  const validated = SearchPatientsQuerySchema.safeParse(input);
  if (!validated.success) {
    return { success: false, status: 400, error: "Invalid input", details: validated.error.flatten() };
  }

  try {
    const { query, page, limit } = validated.data;
    const patients = await patientService.searchPatients(context, query || "", page, limit);
    return { success: true, status: 200, data: patients };
  } catch (error) {
    return { success: false, status: 500, error: "Failed to search patients" };
  }
}

export async function getPatientHistoryAction(patientId: string) {
  const context = getAuthenticatedContext();
  try {
    const patient = await patientService.getById(context, patientId);
    if (!patient) return { success: false, status: 404, error: "Patient not found" };
    
    const history = await patientService.getPatientHistory(context, patientId);
    return { success: true, status: 200, data: history };
  } catch (error) {
    return { success: false, status: 500, error: "Failed to fetch history" };
  }
}

export async function getPatientsListAction(query: string = "", page: number = 1, limit: number = 20) {
  const context = getAuthenticatedContext();
  try {
    const offset = (page - 1) * limit;

    let whereClause = eq(schema.patients.organizationId, context.organization_id);
    if (query.trim()) {
      whereClause = and(
        eq(schema.patients.organizationId, context.organization_id),
        or(
          ilike(schema.patients.firstName, `%${query}%`),
          ilike(schema.patients.lastName, `%${query}%`),
          ilike(schema.patients.phone, `%${query}%`),
          ilike(schema.patients.email, `%${query}%`)
        )
      )!;
    }

    const patientRows = await db
      .select()
      .from(schema.patients)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.patients.createdAt));

    const totalCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.patients)
      .where(whereClause);
    const total = Number(totalCountRes[0]?.count || patientRows.length);

    const patientsWithAppointments: PatientListItem[] = await Promise.all(
      patientRows.map(async (p) => {
        const lastApt = await db
          .select({
            startAt: schema.appointments.startAt,
          })
          .from(schema.appointments)
          .where(and(
            eq(schema.appointments.organizationId, context.organization_id),
            eq(schema.appointments.patientId, p.patientId)
          ))
          .orderBy(desc(schema.appointments.startAt))
          .limit(1);

        const totalApts = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.appointments)
          .where(and(
            eq(schema.appointments.organizationId, context.organization_id),
            eq(schema.appointments.patientId, p.patientId)
          ));

        return {
          patientId: p.patientId,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          email: p.email,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          whatsappOptIn: p.whatsappOptIn,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          lastAppointmentDate: lastApt[0]?.startAt ? lastApt[0].startAt.toISOString() : null,
          totalAppointments: Number(totalApts[0]?.count || 0),
        };
      })
    );

    return {
      success: true,
      status: 200,
      data: patientsWithAppointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error) {
    console.error("Error in getPatientsListAction:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch patients",
      data: [],
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }
}

export async function getPatientDetailsAction(patientId: string) {
  const context = getAuthenticatedContext();
  try {
    const patientResult = await db
      .select()
      .from(schema.patients)
      .where(and(
        eq(schema.patients.organizationId, context.organization_id),
        eq(schema.patients.patientId, patientId)
      ))
      .limit(1);

    const patient = patientResult[0];
    if (!patient) {
      return { success: false, status: 404, error: "Patient not found" };
    }

    const historyRows = await db
      .select({
        appointment: schema.appointments,
        dentist: schema.dentists,
        service: schema.services,
      })
      .from(schema.appointments)
      .leftJoin(
        schema.dentists,
        and(
          eq(schema.appointments.dentistId, schema.dentists.dentistId),
          eq(schema.appointments.organizationId, schema.dentists.organizationId)
        )
      )
      .leftJoin(
        schema.services,
        and(
          eq(schema.appointments.serviceId, schema.services.serviceId),
          eq(schema.appointments.organizationId, schema.services.organizationId)
        )
      )
      .where(and(
        eq(schema.appointments.organizationId, context.organization_id),
        eq(schema.appointments.patientId, patientId)
      ))
      .orderBy(desc(schema.appointments.startAt));

    const history: PatientHistoryItem[] = historyRows.map(({ appointment, dentist, service }) => ({
      appointmentId: appointment.appointmentId,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status as AppointmentStatus,
      serviceName: appointment.serviceNameSnapshot || service?.name || "Servicio Dental",
      dentistName: dentist ? (dentist.professionalName || `Dr. ${dentist.firstName} ${dentist.lastName}`) : "Odontólogo General",
      dentistSpecialty: dentist?.specialty || null,
      serviceValue: appointment.serviceValueSnapshot || service?.price || null,
      durationMinutes: appointment.serviceDurationSnapshot || service?.durationMinutes || 30,
      notes: appointment.notes,
    }));

    const total = history.length;
    const completed = history.filter((h) => h.status === "COMPLETED").length;
    const cancelled = history.filter((h) => h.status === "CANCELLED").length;

    const profileData: PatientProfileData = {
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      whatsappOptIn: patient.whatsappOptIn,
      status: patient.status,
      createdAt: patient.createdAt.toISOString(),
      history,
      stats: {
        totalAppointments: total,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
      },
    };

    return {
      success: true,
      status: 200,
      data: profileData,
    };
  } catch (error) {
    console.error("Error in getPatientDetailsAction:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch patient details",
    };
  }
}
