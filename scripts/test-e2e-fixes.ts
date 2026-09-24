import { db } from "../src/shared/database";
import * as schema from "../src/shared/database/schema";
import { eq } from "drizzle-orm";
import {
  getClinicTodayDateStr,
  shiftDateStr,
  getAppointmentTimeParts,
} from "../src/shared/utils/date-time";
import {
  executeBookAppointment,
  executeRescheduleAppointment,
  clinicalMcpTools,
} from "../src/modules/ai/mcp/clinical-mcp-engine";
import { buildClinicalSystemPrompt } from "../src/modules/ai/services/ai.service";

async function runE2EFixesTests() {
  console.log("==================================================================");
  console.log("  TEST SUITE: E2E BOT PRODUCTION FIXES & ENHANCEMENTS");
  console.log("==================================================================");

  // TEST 1: Timezone Midnight Rollover Fix
  console.log("\n[TEST 1] Timezone Midnight Rollover Prevention (America/Mazatlan)");
  const mazatlanToday = getClinicTodayDateStr("America/Mazatlan");
  console.log("Clinic Today (Mazatlan):", mazatlanToday);

  // Verify that an explicit date in evening (e.g. 19:30 Mazatlan, which is 02:30 UTC next day) computes correct local day
  const eveningUtc = new Date("2026-09-23T02:30:00.000Z"); // 19:30 on 2026-09-22 in Mazatlan (UTC-7)
  const partsEvening = getAppointmentTimeParts(eveningUtc, "America/Mazatlan");
  console.log("UTC: 2026-09-23T02:30:00Z -> Mazatlan Local:", `${partsEvening.dateStr} ${partsEvening.timeStr}`);
  if (partsEvening.dateStr !== "2026-09-22" || partsEvening.timeStr !== "19:30") {
    throw new Error(`Timezone shift error! Expected 2026-09-22 19:30, got ${partsEvening.dateStr} ${partsEvening.timeStr}`);
  }

  // Verify shiftDateStr across month boundaries without UTC drifts
  const sep30Shift = shiftDateStr("2026-09-30", 1);
  const oct01Shift = shiftDateStr("2026-10-01", -1);
  console.log("2026-09-30 + 1 day:", sep30Shift, "Expected: 2026-10-01");
  console.log("2026-10-01 - 1 day:", oct01Shift, "Expected: 2026-09-30");
  if (sep30Shift !== "2026-10-01" || oct01Shift !== "2026-09-30") {
    throw new Error("shiftDateStr month rollover failed!");
  }
  console.log("✅ TEST 1 PASSED: Timezone calculation strictly preserves America/Mazatlan date.");

  // TEST 2: Clinical Notes in book_appointment
  console.log("\n[TEST 2] Clinical Notes in book_appointment MCP Tool");
  const testPhone = `+52669${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testPatientName = "Rodrigo Morales Test";
  const clinicalNoteSample = "Dolor punzante en molar superior derecho al ingerir bebidas frías desde hace 4 días.";

  const bookRes = await executeBookAppointment({
    patientName: testPatientName,
    phone: testPhone,
    serviceType: "Valoración General y Diagnóstico",
    datetime: "2026-11-10 10:00",
    clinical_notes: clinicalNoteSample,
  });

  console.log("Book appointment result:", bookRes.success, "Folio:", bookRes.folio);
  if (!bookRes.success || !bookRes.appointmentId) {
    throw new Error(`Failed to book appointment: ${JSON.stringify(bookRes)}`);
  }

  const [dbApt] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.appointmentId, bookRes.appointmentId));

  if (!dbApt) throw new Error("Booked appointment not found in DB!");
  console.log("DB notes field:\n", `"${dbApt.notes}"`);
  if (!dbApt.notes || !dbApt.notes.includes(clinicalNoteSample)) {
    throw new Error("Clinical notes were not persisted in appointment record!");
  }
  console.log("✅ TEST 2 PASSED: Clinical notes properly concatenated and stored in appointments.notes.");

  // TEST 3: Reschedule Appointment MCP Tool (No Duplication)
  console.log("\n[TEST 3] Reschedule Appointment (In-Place Update Without Duplication)");
  const countBeforeReschedule = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.patientId, dbApt.patientId));
  console.log("Active appointments for patient before reschedule:", countBeforeReschedule.length);

  const rescheduleRes = await executeRescheduleAppointment({
    appointmentId: bookRes.appointmentId,
    phone: testPhone,
    newDate: "2026-11-12",
    newTime: "15:00",
    reason: "El paciente tiene una reunión de trabajo y requiere cambiar horario",
  });

  console.log("Reschedule result:", rescheduleRes.success, rescheduleRes.message);
  if (!rescheduleRes.success) {
    throw new Error(`Reschedule failed: ${rescheduleRes.error}`);
  }

  const countAfterReschedule = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.patientId, dbApt.patientId));
  console.log("Active appointments for patient after reschedule:", countAfterReschedule.length);

  if (countAfterReschedule.length !== countBeforeReschedule.length) {
    throw new Error("Reschedule created a duplicate appointment instead of updating!");
  }

  const [dbAptAfter] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.appointmentId, bookRes.appointmentId));

  const afterTimeParts = getAppointmentTimeParts(dbAptAfter!.startAt, "America/Mexico_City");
  console.log("Updated appointment local start time (Branch TZ):", `${afterTimeParts.dateStr} ${afterTimeParts.timeStr}`);
  if (afterTimeParts.dateStr !== "2026-11-12" || afterTimeParts.timeStr !== "15:00") {
    throw new Error(`Rescheduled slot mismatch! Expected 2026-11-12 15:00, got ${afterTimeParts.dateStr} ${afterTimeParts.timeStr}`);
  }

  if (!dbAptAfter?.notes?.includes("Reprogramada vía WhatsApp IA")) {
    throw new Error("Reschedule audit log was not appended to appointment notes!");
  }

  // Also verify double-booking prevention returns error gracefully
  console.log("\n[TEST 3.1] Double-booking conflict prevention check");
  const conflictRes = await executeRescheduleAppointment({
    appointmentId: bookRes.appointmentId,
    phone: testPhone,
    newDate: "2026-09-22",
    newTime: "09:00", // Conflicts with existing 09:00 appointment on Dr. Carlos García
  });
  console.log("Conflict attempt result:", conflictRes.success, "Error:", conflictRes.error);
  if (conflictRes.success || (!conflictRes.error?.includes("conflicto") && !conflictRes.error?.includes("ocupado"))) {
    throw new Error("Expected double-booking conflict error, but got success or unknown error!");
  }
  console.log("✅ TEST 3 PASSED: reschedule_appointment updates slot cleanly and detects double-booking conflicts.");

  // TEST 4: Tool Registration in clinicalMcpTools
  console.log("\n[TEST 4] MCP Tools Registry Verification");
  if (!clinicalMcpTools.reschedule_appointment) {
    throw new Error("reschedule_appointment tool not found in clinicalMcpTools dictionary!");
  }
  if (!clinicalMcpTools.book_appointment) {
    throw new Error("book_appointment tool missing!");
  }
  console.log("Available MCP tools:", Object.keys(clinicalMcpTools).join(", "));
  console.log("✅ TEST 4 PASSED: reschedule_appointment exported in clinicalMcpTools.");

  // TEST 5: System Prompt Directives (Temporal Anchor, Out of scope, Greetings, Reschedule, Dependents & Non-empty obligation)
  console.log("\n[TEST 5] System Prompt Rules & Temporal Anchor Verification");
  const prompt = buildClinicalSystemPrompt({
    patientPhone: testPhone,
    contactName: testPatientName,
  });

  if (!prompt.startsWith("HOY ES:")) {
    throw new Error("System prompt does not begin with 'HOY ES:' temporal anchor!");
  }
  if (!prompt.includes("NUNCA ofrezcas fechas en el pasado y usa este dato como tu única fuente de verdad para el tiempo.")) {
    throw new Error("System prompt missing strict temporal anchor source of truth text!");
  }
  if (!prompt.includes("PACIENTES DEPENDIENTES (MENORES")) {
    throw new Error("System prompt missing dependent minors rule!");
  }
  if (!prompt.includes("PACIENTE REAL:")) {
    throw new Error("System prompt missing 'PACIENTE REAL:' instruction for clinical_notes!");
  }
  if (!prompt.includes("OBLIGACIÓN DE RESPUESTA")) {
    throw new Error("System prompt missing response obligation rule!");
  }
  if (!prompt.includes("NUNCA devuelvas una respuesta vacía")) {
    throw new Error("System prompt missing non-empty reply mandate!");
  }
  if (!prompt.includes("SALUDOS Y CORTESÍA OBLIGATORIA")) {
    throw new Error("System prompt missing greeting mandate!");
  }
  if (!prompt.includes("FUERA DE ALCANCE (OUT OF SCOPE)")) {
    throw new Error("System prompt missing out-of-scope rule!");
  }
  if (!prompt.includes("Laboratorio Núñez") && !prompt.includes("laboratorios externos")) {
    throw new Error("System prompt missing laboratory anti-hallucination directive!");
  }
  if (!prompt.includes("reschedule_appointment")) {
    throw new Error("System prompt missing reschedule_appointment directive!");
  }
  if (!prompt.includes("clinical_notes")) {
    throw new Error("System prompt missing clinical_notes extraction instruction!");
  }
  console.log("✅ TEST 5 PASSED: Temporal anchor, dependent minors, response obligation, and safety directives validated.");

  // Clean up test records
  await db.delete(schema.appointments).where(eq(schema.appointments.appointmentId, bookRes.appointmentId));
  await db.delete(schema.patients).where(eq(schema.patients.patientId, dbApt.patientId));
  console.log("Cleaned up test appointment and patient records.");

  console.log("\n==================================================================");
  console.log("  ALL E2E FIXES TESTS PASSED WITH 100% SUCCESS! ");
  console.log("==================================================================");
  process.exit(0);
}

runE2EFixesTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
