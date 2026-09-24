import { tool } from "ai";
import { z } from "zod";
import { db } from "../../../shared/database";
import * as schema from "../../../shared/database/schema";
import { and, eq, gte, lte, ilike, or, desc, notInArray } from "drizzle-orm";
import { getAuthenticatedContext } from "../../../shared/auth/context";
import { revalidatePath } from "next/cache";
import {
  formatAppointmentTime,
  formatAppointmentDate,
  getLocalDayBounds,
  parseLocalDateTime,
  localToUtc,
} from "@/shared/utils/date-time";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore outside Next.js request context
  }
}

// Fallback clinic IDs (matching standard seeded entities)
const DEFAULT_ORG_ID = "00000000-0000-4000-a000-000000000001";
const DEFAULT_DENTIST_ID = "00000000-0000-4000-a000-000000000003"; // Dr. Carlos García Demo
const DEFAULT_LOCATION_ID = "00000000-0000-4000-a000-000000000004"; // Sucursal Centro
const DEFAULT_RESOURCE_ID = "00000000-0000-4000-a000-000000000005"; // Sillón Dental 1
const DEFAULT_SERVICE_ID = "00000000-0000-4000-a000-000000000016"; // Valoración General y Diagnóstico

/**
 * Standard clinic schedule: 09:00 to 18:00 in 45-minute intervals
 */
const STANDARD_SLOTS = [
  "09:00",
  "09:45",
  "10:30",
  "11:15",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "16:45",
  "17:30",
];

/**
 * Parses and sanitizes date strings into a valid YYYY-MM-DD format
 */
function parseTargetDate(dateStr: string): string {
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If ISO string like 2026-09-22T...
  if (dateStr.includes("T")) {
    return dateStr.split("T")[0] ?? dateStr;
  }

  // Attempt to parse standard date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0] ?? dateStr;
  }

  // Fallback: return as-is
  return dateStr;
}

/**
 * 1. MCP Tool: check_availability
 * Queries the database for available chairs, dentists, and open time slots.
 */
export async function executeCheckAvailability(params: {
  date: string;
  time?: string;
}) {
  const context = getAuthenticatedContext();
  const orgId = context.organization_id || DEFAULT_ORG_ID;

  const targetDateStr = parseTargetDate(params.date);
  const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);

  if (isNaN(targetDate.getTime())) {
    return {
      success: false,
      error: `Formato de fecha inválido: "${params.date}". Usa formato YYYY-MM-DD.`,
      availableSlots: [],
    };
  }

  const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday...
  if (dayOfWeek === 0) {
    return {
      success: true,
      date: targetDateStr,
      isClinicOpen: false,
      message: "La clínica está cerrada los domingos. Atendemos de lunes a sábado de 09:00 a 18:00 hrs.",
      availableSlots: [],
      chairsAvailable: 0,
    };
  }

  // Fetch active dentists, dental chairs, and locations
  const [dentistList, chairList, locationList] = await Promise.all([
    db.select().from(schema.dentists).where(eq(schema.dentists.organizationId, orgId)),
    db.select().from(schema.resources).where(eq(schema.resources.organizationId, orgId)),
    db.select().from(schema.locations).where(eq(schema.locations.organizationId, orgId)),
  ]);

  const locationRecord = locationList[0];
  const locationTimezone = locationRecord?.timezone || "America/Mexico_City";

  const { startOfDay, endOfDay } = getLocalDayBounds(targetDateStr, locationTimezone);

  // Fetch existing appointments on that day
  const existingAppointments = await db
    .select({
      appointmentId: schema.appointments.appointmentId,
      startAt: schema.appointments.startAt,
      endAt: schema.appointments.endAt,
      status: schema.appointments.status,
    })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.organizationId, orgId),
        gte(schema.appointments.startAt, startOfDay),
        lte(schema.appointments.startAt, endOfDay),
        or(
          eq(schema.appointments.status, "SCHEDULED"),
          eq(schema.appointments.status, "CONFIRMED")
        )
      )
    );

  // Extract occupied hours respecting location timezone (e.g. "11:15")
  const occupiedHours = new Set(
    existingAppointments.map((app) => formatAppointmentTime(app.startAt, locationTimezone))
  );

  // Filter available slots
  const availableSlots = STANDARD_SLOTS.filter((slot) => !occupiedHours.has(slot));

  // If a specific time was requested, check if it's available
  let isRequestedTimeAvailable: boolean | undefined = undefined;
  if (params.time) {
    const cleanTime = params.time.trim().slice(0, 5);
    isRequestedTimeAvailable = availableSlots.some((slot) => slot.startsWith(cleanTime.slice(0, 2)));
  }

  const activeDentistNames = dentistList
    .map((d) => d.professionalName || `Dr. ${d.firstName} ${d.lastName}`)
    .filter(Boolean);

  return {
    success: true,
    date: targetDateStr,
    dayOfWeek: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][dayOfWeek],
    isClinicOpen: true,
    availableSlots,
    requestedTime: params.time ?? null,
    isRequestedTimeAvailable: isRequestedTimeAvailable ?? null,
    totalAvailableSlots: availableSlots.length,
    chairsAvailable: chairList.length > 0 ? chairList.length : 2,
    dentistsOnDuty: activeDentistNames.length > 0 ? activeDentistNames : ["Dr. Carlos García Demo", "Dra. Valeria Montes"],
    message:
      availableSlots.length > 0
        ? `Horarios disponibles para ${targetDateStr}: ${availableSlots.slice(0, 6).join(", ")}${availableSlots.length > 6 ? "..." : ""}`
        : `No hay turnos disponibles para el ${targetDateStr}. Te sugerimos consultar el día siguiente.`,
  };
}

/**
 * 2. MCP Tool: book_appointment
 * Inserts confirmed appointment into the database and generates clinical record.
 */
export async function executeBookAppointment(params: {
  patientName: string;
  phone: string;
  serviceType: string;
  datetime: string;
  clinicLocation?: string;
  clinical_notes?: string;
  is_emergency?: boolean;
}) {
  const context = getAuthenticatedContext();
  const orgId = context.organization_id || DEFAULT_ORG_ID;

  // Clean phone to digits
  const cleanPhone = params.phone.replace(/\D/g, "");

  // 1. Resolve or Create Patient
  let patientRecord = await db
    .select()
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.organizationId, orgId),
        or(
          ilike(schema.patients.phone, `%${cleanPhone.slice(-10)}%`),
          ilike(schema.patients.phone, `%${cleanPhone}%`)
        )
      )
    )
    .limit(1)
    .then((res) => res[0]);

  if (!patientRecord) {
    // Split name into first and last name
    const parts = params.patientName.trim().split(" ");
    const firstName = parts[0] || "Paciente";
    const lastName = parts.slice(1).join(" ") || "WhatsApp";

    const [newPatient] = await db
      .insert(schema.patients)
      .values({
        organizationId: orgId,
        firstName,
        lastName,
        phone: cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`,
        whatsappOptIn: true,
        whatsappOptInAt: new Date(),
        status: "ACTIVE",
      })
      .returning();

    if (!newPatient) {
      throw new Error("No se pudo registrar al paciente en la base de datos.");
    }

    patientRecord = newPatient;
  }

  // 2. Resolve Service
  const serviceList = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.organizationId, orgId));

  // Find service matching keywords (e.g. "limpieza", "valoracion", "resina", "blanqueamiento")
  const targetLower = params.serviceType.toLowerCase();
  const matchedService =
    serviceList.find((s) => targetLower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(targetLower)) ||
    serviceList.find((s) => targetLower.includes("limpieza") && s.name.toLowerCase().includes("limpieza")) ||
    serviceList[0];

  const serviceId = matchedService?.serviceId || DEFAULT_SERVICE_ID;
  const serviceName = matchedService?.name || params.serviceType || "Consulta Odontológica";
  const durationMinutes = matchedService?.durationMinutes || 45;
  const price = matchedService?.price || "800.00";

  // 3. Resolve Dentist, Location, Resource (Chair)
  const [dentists, locations, resources] = await Promise.all([
    db.select().from(schema.dentists).where(eq(schema.dentists.organizationId, orgId)),
    db.select().from(schema.locations).where(eq(schema.locations.organizationId, orgId)),
    db.select().from(schema.resources).where(eq(schema.resources.organizationId, orgId)),
  ]);

  const matchedLocation = params.clinicLocation
    ? locations.find((l) => l.name.toLowerCase().includes(params.clinicLocation!.toLowerCase()) || l.code.toLowerCase() === params.clinicLocation!.toLowerCase()) || locations[0]
    : locations[0];

  const dentistId = dentists[0]?.dentistId || DEFAULT_DENTIST_ID;
  const dentistName = dentists[0]?.professionalName || "Dr. Carlos García Demo";
  const locationId = matchedLocation?.locationId || DEFAULT_LOCATION_ID;
  const locationName = matchedLocation?.name || params.clinicLocation || "Sucursal Central Polanco";
  const locationTimezone = matchedLocation?.timezone || "America/Mexico_City";
  const resourceId = resources[0]?.resourceId || DEFAULT_RESOURCE_ID;

  // 4. Calculate startAt and endAt respecting location's timezone
  let startAt = parseLocalDateTime(params.datetime, locationTimezone);

  if (isNaN(startAt.getTime())) {
    // Fallback: if only time was passed, combine with tomorrow's date in locationTimezone
    const [hours = 10, minutes = 0] = params.datetime.split(":").map(Number);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0]!;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    startAt = localToUtc(dateStr, timeStr, locationTimezone);
  }

  const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

  // 5. Insert Appointment Record
  let createdAppointment: typeof schema.appointments.$inferSelect | undefined;
  try {
    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        organizationId: orgId,
        patientId: patientRecord.patientId,
        dentistId,
        locationId,
        resourceId,
        serviceId,
        startAt,
        endAt,
        status: "SCHEDULED",
        notes: (() => {
          const emergencyTag = params.is_emergency ? "🚨 [URGENCIA CLÍNICA] " : "";
          if (params.clinical_notes?.trim()) {
            return `${emergencyTag}Agendado automáticamente vía Asistente WhatsApp | Motivo/Síntomas: ${params.clinical_notes.trim()}`;
          }
          return `${emergencyTag}Agendado automáticamente vía Asistente WhatsApp por ${params.patientName}`;
        })(),
        serviceNameSnapshot: serviceName,
        serviceDurationSnapshot: durationMinutes,
        serviceValueSnapshot: price,
        createdByUserId: context.user_id,
      })
      .returning();
    createdAppointment = appointment;
  } catch (err: unknown) {
    const isExclusion = (err as { code?: string })?.code === "23P01";
    if (isExclusion) {
      return {
        success: false,
        error: `El horario solicitado (${params.datetime}) ya se encuentra ocupado con el especialista. Por favor consulta los turnos disponibles con 'check_availability'.`,
      };
    }
    throw err;
  }

  safeRevalidatePath("/agenda");
  safeRevalidatePath("/pacientes");
  if (patientRecord.patientId) {
    safeRevalidatePath(`/pacientes/${patientRecord.patientId}`);
  }

  const formattedDate = formatAppointmentDate(startAt, locationTimezone);
  const formattedTime = formatAppointmentTime(startAt, locationTimezone);

  return {
    success: true,
    appointmentId: createdAppointment?.appointmentId,
    folio: createdAppointment?.appointmentId?.slice(0, 8).toUpperCase(),
    patientName: `${patientRecord.firstName} ${patientRecord.lastName}`,
    phone: patientRecord.phone,
    service: serviceName,
    date: formattedDate,
    time: formattedTime,
    durationMinutes,
    price: `$${price} MXN`,
    dentist: dentistName,
    location: locationName,
    message: `Cita confirmada con éxito para ${params.patientName}. Folio: ${createdAppointment?.appointmentId?.slice(0, 8).toUpperCase()}. Servicio: ${serviceName} el ${formattedDate} a las ${formattedTime} hrs en ${locationName}.`,
  };
}

/**
 * Vercel AI SDK Tool: check_availability
 */
export const checkAvailabilityMcpTool = tool({
  description:
    "Consulta los turnos y sillones dentales disponibles en la clínica para una fecha y hora específicas. Usa esta herramienta cuando el usuario pregunte por horarios, turnos libres o antes de agendar.",
  inputSchema: z.object({
    date: z
      .string()
      .describe(
        "Fecha a consultar en formato YYYY-MM-DD (por ejemplo: '2026-09-22'). Si el usuario dice 'mañana' o 'el jueves', calcula la fecha exacta en base a la fecha actual del sistema."
      ),
    time: z
      .string()
      .optional()
      .describe("Hora específica solicitada en formato HH:mm (por ejemplo: '10:00' o '16:00')."),
  }),
  execute: async ({ date, time }: { date: string; time?: string }) => {
    console.log(`[MCP Tool: check_availability] 🔍 Consultando fecha=${date}, hora=${time ?? "cualquiera"}`);
    const result = await executeCheckAvailability({ date, time });
    console.log(
      `[MCP Tool: check_availability] 📊 Resultado: ${result.availableSlots.length} slots disponibles.`
    );
    return result;
  },
});

/**
 * Vercel AI SDK Tool: book_appointment
 */
export const bookAppointmentMcpTool = tool({
  description:
    "Inserta y confirma una cita dental en la base de datos de Clinical Cloud. Ejecuta esta herramienta de inmediato cuando el paciente confirme o entregue sus datos mínimos (nombre, servicio/motivo de consulta, fecha y hora).",
  inputSchema: z.object({
    patientName: z.string().describe("Nombre completo del paciente."),
    phone: z.string().describe("Número de teléfono o WhatsApp del paciente (con código de país o 10 dígitos)."),
    serviceType: z
      .string()
      .describe("Tipo de servicio o tratamiento solicitado (ej. 'Limpieza Dental', 'Valoración General', 'Resina', 'Extracción')."),
    datetime: z
      .string()
      .describe("Fecha y hora de inicio de la cita en formato 'YYYY-MM-DD HH:mm' o ISO (por ejemplo: '2026-09-22 10:00')."),
    clinicLocation: z.string().optional().describe("Sucursal de la clínica (por defecto 'Sucursal Centro')."),
    clinical_notes: z
      .string()
      .optional()
      .describe(
        "Observaciones clínicas, motivo detallado de la consulta, síntomas manifestados por el paciente o piezas dentales afectadas (ej. 'Dolor agudo en molar inferior derecho al masticar', 'Revisión y limpieza dental de rutina')."
      ),
    is_emergency: z
      .boolean()
      .optional()
      .describe(
        "Indica si la cita es una urgencia médica o dental inmediata (dolor agudo, trauma, sangrado activo)."
      ),
  }),
  execute: async (params: {
    patientName: string;
    phone: string;
    serviceType: string;
    datetime: string;
    clinicLocation?: string;
    clinical_notes?: string;
    is_emergency?: boolean;
  }) => {
    console.log(
      `[MCP Tool: book_appointment] 📝 Agendando cita para ${params.patientName} (${params.phone}) - Servicio: ${params.serviceType} en ${params.datetime} [Urgencia: ${params.is_emergency ? "SÍ" : "NO"}]`
    );
    const result = await executeBookAppointment(params);
    console.log(`[MCP Tool: book_appointment] ✅ Cita registrada. Folio: ${result.folio}`);
    return result;
  },
});

/**
 * 3. MCP Tool: reschedule_appointment
 * Reprograma una cita existente a una nueva fecha y hora sin duplicar la cita ni dejar turnos huérfanos.
 */
export async function executeRescheduleAppointment(params: {
  appointmentId?: string;
  phone?: string;
  newDate: string;
  newTime: string;
  reason?: string;
}) {
  const context = getAuthenticatedContext();
  const orgId = context.organization_id || DEFAULT_ORG_ID;

  // 1. Locate the appointment to reschedule
  let targetAppointment: typeof schema.appointments.$inferSelect | undefined;

  if (params.appointmentId && params.appointmentId.trim()) {
    const rawId = params.appointmentId.trim().toLowerCase();
    const candidates = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.organizationId, orgId));

    targetAppointment = candidates.find(
      (a) =>
        a.appointmentId.toLowerCase() === rawId ||
        a.appointmentId.slice(0, 8).toLowerCase() === rawId
    );
  }

  if (!targetAppointment && params.phone) {
    const cleanPhone = params.phone.replace(/\D/g, "");
    const patientRecord = await db
      .select()
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.organizationId, orgId),
          or(
            ilike(schema.patients.phone, `%${cleanPhone.slice(-10)}%`),
            ilike(schema.patients.phone, `%${cleanPhone}%`)
          )
        )
      )
      .limit(1)
      .then((res) => res[0]);

    if (patientRecord) {
      const patientAppointments = await db
        .select()
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.organizationId, orgId),
            eq(schema.appointments.patientId, patientRecord.patientId),
            or(
              eq(schema.appointments.status, "SCHEDULED"),
              eq(schema.appointments.status, "CONFIRMED")
            )
          )
        )
        .orderBy(desc(schema.appointments.startAt));

      targetAppointment = patientAppointments[0];
    }
  }

  if (!targetAppointment) {
    return {
      success: false,
      error:
        "No se encontró una cita previa activa que pueda ser reprogramada para este paciente o con ese identificador. Por favor verifica el folio o proporciona el número telefónico.",
    };
  }

  // 2. Resolve branch location timezone
  const location = await db
    .select()
    .from(schema.locations)
    .where(
      and(
        eq(schema.locations.organizationId, orgId),
        eq(schema.locations.locationId, targetAppointment.locationId)
      )
    )
    .limit(1)
    .then((res) => res[0]);

  const locationTimezone = location?.timezone || "America/Mazatlan";
  const locationName = location?.name || "Sucursal Centro";

  // 3. Calculate new start and end UTC times
  const targetDateStr = parseTargetDate(params.newDate);
  const cleanTime = params.newTime.trim();
  const newUtcStartAt = localToUtc(targetDateStr, cleanTime, locationTimezone);
  const durationMinutes = targetAppointment.serviceDurationSnapshot || 45;
  const newUtcEndAt = new Date(newUtcStartAt.getTime() + durationMinutes * 60000);

  // 4. Double-booking conflict prevention (aligned with DB exclusion constraint)
  const conflicting = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.organizationId, orgId),
        eq(schema.appointments.dentistId, targetAppointment.dentistId),
        notInArray(schema.appointments.status, ["CANCELLED", "RESCHEDULED"])
      )
    );

  const hasConflict = conflicting.some((apt) => {
    if (apt.appointmentId === targetAppointment?.appointmentId) return false;
    return apt.startAt < newUtcEndAt && apt.endAt > newUtcStartAt;
  });

  if (hasConflict) {
    return {
      success: false,
      error: `El horario solicitado (${targetDateStr} a las ${cleanTime} hrs) ya se encuentra ocupado con el especialista. Por favor consulta turnos disponibles con 'check_availability'.`,
    };
  }

  // 5. Update appointment in PostgreSQL
  const previousStartAt = targetAppointment.startAt;
  const reasonText = params.reason ? ` (Motivo: ${params.reason.trim()})` : "";
  const newNotes = `${targetAppointment.notes || ""}\n[Reprogramada vía WhatsApp IA a ${targetDateStr} ${cleanTime}${reasonText}]`.trim();

  try {
    const [updatedAppointment] = await db
      .update(schema.appointments)
      .set({
        startAt: newUtcStartAt,
        endAt: newUtcEndAt,
        status: "CONFIRMED",
        notes: newNotes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.organizationId, orgId),
          eq(schema.appointments.appointmentId, targetAppointment.appointmentId)
        )
      )
      .returning();

    if (!updatedAppointment) {
      throw new Error("No se pudo actualizar la cita en la base de datos.");
    }

    safeRevalidatePath("/agenda");
    safeRevalidatePath("/citas/nueva");
    if (targetAppointment.patientId) {
      safeRevalidatePath(`/pacientes/${targetAppointment.patientId}`);
    }

    const prevFormattedDate = formatAppointmentDate(previousStartAt, locationTimezone);
    const prevFormattedTime = formatAppointmentTime(previousStartAt, locationTimezone);
    const newFormattedDate = formatAppointmentDate(newUtcStartAt, locationTimezone);
    const newFormattedTime = formatAppointmentTime(newUtcStartAt, locationTimezone);

    return {
      success: true,
      appointmentId: updatedAppointment.appointmentId,
      folio: updatedAppointment.appointmentId.slice(0, 8).toUpperCase(),
      service: updatedAppointment.serviceNameSnapshot,
      previousDate: prevFormattedDate,
      previousTime: prevFormattedTime,
      newDate: newFormattedDate,
      newTime: newFormattedTime,
      location: locationName,
      message: `Cita reprogramada exitosamente. Folio: ${updatedAppointment.appointmentId.slice(0, 8).toUpperCase()}. Tu cita para ${updatedAppointment.serviceNameSnapshot} ha sido cambiada del ${prevFormattedDate} (${prevFormattedTime} hrs) al ${newFormattedDate} a las ${newFormattedTime} hrs en ${locationName}.`,
    };
  } catch (err: unknown) {
    const isExclusion = (err as { code?: string })?.code === "23P01";
    if (isExclusion) {
      return {
        success: false,
        error: `El horario solicitado (${targetDateStr} a las ${cleanTime} hrs) genera conflicto con otra cita asignada al doctor. Por favor elige otro horario o consulta 'check_availability'.`,
      };
    }
    throw err;
  }
}

/**
 * Vercel AI SDK Tool: reschedule_appointment
 */
export const rescheduleAppointmentMcpTool = tool({
  description:
    "Reprograma una cita existente a una nueva fecha y hora. Usa esta herramienta OBLIGATORIAMENTE cuando el paciente pida cambiar, mover o reprogramar su cita existente. NUNCA uses 'book_appointment' para reagendar porque duplicaría la cita.",
  inputSchema: z.object({
    appointmentId: z
      .string()
      .optional()
      .describe("Folio o ID de la cita existente si el paciente lo mencionó o figura en el historial."),
    phone: z
      .string()
      .optional()
      .describe("Número de teléfono o WhatsApp del paciente para localizar su cita activa previa."),
    newDate: z
      .string()
      .describe("Nueva fecha solicitada en formato YYYY-MM-DD (ej. '2026-09-24')."),
    newTime: z
      .string()
      .describe("Nueva hora solicitada en formato HH:mm (ej. '11:00' o '16:00')."),
    reason: z
      .string()
      .optional()
      .describe("Motivo de la reprogramación manifestado por el paciente."),
  }),
  execute: async (params: {
    appointmentId?: string;
    phone?: string;
    newDate: string;
    newTime: string;
    reason?: string;
  }) => {
    console.log(
      `[MCP Tool: reschedule_appointment] 🔄 Reprogramando cita para ${params.newDate} ${params.newTime} (ID: ${params.appointmentId || "N/A"}, Phone: ${params.phone || "N/A"})`
    );
    const result = await executeRescheduleAppointment(params);
    console.log(
      `[MCP Tool: reschedule_appointment] 📊 Resultado reprogramación: success=${result.success}`
    );
    return result;
  },
});

/**
 * 3. MCP Tool: get_treatment_prices
 * Consulta los servicios y tratamientos activos de la clínica con su precio oficial, duración y descripción.
 */
export async function executeGetTreatmentPrices(params?: { query?: string }) {
  const context = getAuthenticatedContext();
  const orgId = context.organization_id || DEFAULT_ORG_ID;

  const rawServices = await db
    .select()
    .from(schema.services)
    .where(
      and(
        eq(schema.services.organizationId, orgId),
        eq(schema.services.status, "ACTIVE")
      )
    );

  let filtered = rawServices;
  if (params?.query && params.query.trim().length > 0) {
    const normalize = (str: string) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    // Support multiple comma-separated, slash-separated, or ' y ' separated search terms
    const rawTerms = params.query
      .split(/[,;\n/]+|\s+y\s+/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const matches = rawServices.filter((service) => {
      const nameNorm = normalize(service.name);
      const descNorm = normalize(service.description || "");

      return rawTerms.some((term) => {
        const termNorm = normalize(term);
        if (nameNorm.includes(termNorm) || descNorm.includes(termNorm)) {
          return true;
        }
        // Match significant individual words (length >= 4, e.g. "muela", "juicio", "resina", "extraccion")
        const words = termNorm.split(/\s+/).filter((w) => w.length >= 4);
        return words.some((w) => nameNorm.includes(w) || descNorm.includes(w));
      });
    });

    if (matches.length > 0) {
      filtered = matches;
    }
  }

  const formattedCatalog = filtered.map((service) => {
    const priceText = service.isVariablePrice
      ? `Precio estimado desde: $${service.price} ${service.currency || "MXN"}`
      : `Precio exacto: $${service.price} ${service.currency || "MXN"}`;

    const aiRule = service.requiresAssessment
      ? "[REGLA ESTRICTA PARA IA: Este tratamiento requiere valoración previa obligatoria. No agendes el tratamiento directo, persuade al paciente para agendar la 'Valoración General y Diagnóstico' primero]."
      : "[Puede agendarse directamente]";

    const desc = service.description ? ` | ${service.description}` : "";
    return `- ${service.name} | ${priceText}${desc} | ${aiRule}`;
  });

  const catalog = filtered.map((s) => ({
    serviceId: s.serviceId,
    name: s.name,
    description: s.description || "",
    price: Number(s.price),
    currency: s.currency || "MXN",
    durationMinutes: s.durationMinutes,
    isVariablePrice: s.isVariablePrice,
    requiresAssessment: s.requiresAssessment,
    aiRule: s.requiresAssessment
      ? "[REGLA ESTRICTA PARA IA: Este tratamiento requiere valoración previa obligatoria. No agendes el tratamiento directo, persuade al paciente para agendar la 'Valoración General y Diagnóstico' primero]."
      : "[Puede agendarse directamente]",
  }));

  return {
    success: true,
    totalServices: catalog.length,
    formattedList: formattedCatalog.join("\n"),
    catalog,
    disclaimer:
      "Precios oficiales de la clínica. Sujetos a valoración y diagnóstico clínico previo si el caso particular presenta complicaciones.",
  };
}

/**
 * Vercel AI SDK Tool: get_treatment_prices
 */
export const getTreatmentPricesMcpTool = tool({
  description:
    "Consulta el tarifario oficial de tratamientos y servicios dentales de Clinical Cloud con sus directivas y reglas estrictas de agendamiento (precio exacto vs. estimado desde $X, y si requiere valoración previa obligatoria). Puedes pasar un solo tratamiento o MÚLTIPLES tratamientos separados por coma en una sola consulta (ej. 'resinas, blanqueamiento, extracción') para cotizar todo de inmediato sin múltiples llamadas. NUNCA inventes precios.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Nombre o lista de tratamientos separados por coma a cotizar (ej. 'limpieza', 'resina, blanqueamiento, extracción'). Déjalo vacío para ver el tarifario completo."
      ),
  }),
  execute: async ({ query }: { query?: string }) => {
    console.log(`[MCP Tool: get_treatment_prices] 💰 Consultando tarifario. Búsqueda="${query ?? "todo"}"`);
    const result = await executeGetTreatmentPrices({ query });
    console.log(
      `[MCP Tool: get_treatment_prices] 📋 Encontrados ${result.catalog.length} tratamientos.`
    );
    return result;
  },
});

/**
 * 4. MCP Tool: register_patient
 * Registra a un nuevo paciente en la base de datos de Clinical Cloud.
 */
export async function executeRegisterPatient(params: {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: "MASCULINO" | "FEMENINO" | "OTRO";
  whatsappOptIn?: boolean;
}) {
  const context = getAuthenticatedContext();
  const orgId = context.organization_id || DEFAULT_ORG_ID;

  const cleanDigits = params.phone.replace(/\D/g, "");
  const formattedPhone = cleanDigits.startsWith("+") ? cleanDigits : `+${cleanDigits}`;

  // Check if patient already exists
  const existing = await db
    .select()
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.organizationId, orgId),
        or(
          eq(schema.patients.phone, formattedPhone),
          ilike(schema.patients.phone, `%${cleanDigits.slice(-10)}%`),
          ilike(schema.patients.phone, `%${cleanDigits}%`)
        )
      )
    )
    .limit(1)
    .then((res) => res[0]);

  if (existing) {
    return {
      success: true,
      isNew: false,
      patientId: existing.patientId,
      fullName: `${existing.firstName} ${existing.lastName}`,
      phone: existing.phone,
      message: `El paciente ya está registrado con ID ${existing.patientId}.`,
    };
  }

  // Insert new patient
  const [created] = await db
    .insert(schema.patients)
    .values({
      organizationId: orgId,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      phone: formattedPhone,
      email: params.email?.trim() || null,
      dateOfBirth: params.dateOfBirth || null,
      gender: params.gender || null,
      whatsappOptIn: params.whatsappOptIn ?? true,
      whatsappOptInAt: new Date(),
      status: "ACTIVE",
    })
    .returning();

  if (!created) {
    throw new Error("No se pudo registrar al paciente en la base de datos.");
  }

  safeRevalidatePath("/pacientes");

  return {
    success: true,
    isNew: true,
    patientId: created.patientId,
    fullName: `${created.firstName} ${created.lastName}`,
    phone: created.phone,
    message: "Paciente registrado exitosamente en Clinical Cloud.",
  };
}

/**
 * Vercel AI SDK Tool: register_patient
 */
export const registerPatientMcpTool = tool({
  description:
    "Registra a un NUEVO paciente en el sistema de Clinical Cloud. Úsala cuando un paciente nuevo proporciona su nombre completo y datos de contacto antes de confirmar su primera cita.",
  inputSchema: z.object({
    firstName: z.string().describe("Nombre(s) del paciente."),
    lastName: z.string().describe("Apellido(s) del paciente."),
    phone: z.string().describe("Número de teléfono o WhatsApp del paciente."),
    email: z.string().optional().describe("Correo electrónico del paciente."),
    dateOfBirth: z.string().optional().describe("Fecha de nacimiento en formato YYYY-MM-DD."),
    gender: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).optional().describe("Género del paciente."),
    whatsappOptIn: z.boolean().optional().describe("Consentimiento para recibir notificaciones por WhatsApp (por defecto true)."),
  }),
  execute: async (params) => {
    console.log(`[MCP Tool: register_patient] 👤 Registrando paciente: ${params.firstName} ${params.lastName} (${params.phone})`);
    const result = await executeRegisterPatient(params);
    console.log(`[MCP Tool: register_patient] ✅ Resultado registro: isNew=${result.isNew}, id=${result.patientId}`);
    return result;
  },
});

/**
 * Exported tools dictionary for Vercel AI SDK generateText / streamText
 */
export const clinicalMcpTools = {
  check_availability: checkAvailabilityMcpTool,
  book_appointment: bookAppointmentMcpTool,
  reschedule_appointment: rescheduleAppointmentMcpTool,
  get_treatment_prices: getTreatmentPricesMcpTool,
  register_patient: registerPatientMcpTool,
};

