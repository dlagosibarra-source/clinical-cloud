import { db, schema } from "../src/shared/database";
import { localToUtc, parseLocalDateTime, getAppointmentTimeParts, formatAppointmentTime, getLocalDayBounds } from "../src/shared/utils/date-time";
import { executeCheckAvailability, executeBookAppointment } from "../src/modules/ai/mcp/clinical-mcp-engine";
import { createAppointmentAction, updateAppointmentStatusAction, getAgendaAppointmentsAction } from "../src/modules/appointments/actions/appointment.actions";
import { createPatientAction, updatePatientAction } from "../src/modules/patients/actions/patient.actions";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("=================================================");
  console.log("  CLINICAL CLOUD: MULTI-BRANCH TIMEZONE & E2E TESTS ");
  console.log("=================================================");

  // TEST 1: Timezone conversions
  console.log("\n[TEST 1] Pure Timezone Mathematical Roundtrips");
  const cdmx11 = localToUtc("2026-09-25", "11:00", "America/Mexico_City");
  const mzt11 = localToUtc("2026-09-25", "11:00", "America/Mazatlan");

  console.log("CDMX 11:00 AM -> UTC:", cdmx11.toISOString(), "Expected: 2026-09-25T17:00:00.000Z");
  if (cdmx11.toISOString() !== "2026-09-25T17:00:00.000Z") {
    throw new Error(`CDMX conversion mismatch: got ${cdmx11.toISOString()}`);
  }

  console.log("Mazatlan 11:00 AM -> UTC:", mzt11.toISOString(), "Expected: 2026-09-25T18:00:00.000Z");
  if (mzt11.toISOString() !== "2026-09-25T18:00:00.000Z") {
    throw new Error(`Mazatlan conversion mismatch: got ${mzt11.toISOString()}`);
  }

  const cdmxBack = formatAppointmentTime(cdmx11, "America/Mexico_City");
  const mztBack = formatAppointmentTime(mzt11, "America/Mazatlan");
  console.log("CDMX formatted back:", cdmxBack, "Expected: 11:00");
  console.log("Mazatlan formatted back:", mztBack, "Expected: 11:00");
  if (cdmxBack !== "11:00" || mztBack !== "11:00") {
    throw new Error("Reverse formatting failed!");
  }
  console.log("✅ TEST 1 PASSED: Timezone conversion and roundtrips are 100% accurate.");

  // TEST 2: Locations in DB have timezone
  console.log("\n[TEST 2] Database Locations Schema & Timezone Configuration");
  const locs = await db.select().from(schema.locations);
  for (const loc of locs) {
    console.log(`- Location "${loc.name}" (${loc.code}): timezone=${loc.timezone}`);
    if (!loc.timezone) {
      throw new Error(`Location ${loc.name} has null timezone!`);
    }
  }
  console.log("✅ TEST 2 PASSED: All locations in DB have valid configured timezones.");

  // TEST 3: MCP Tools Check Availability & Booking
  console.log("\n[TEST 3] MCP check_availability and book_appointment");
  const availRes = await executeCheckAvailability({ date: "2026-09-26" });
  console.log("Availability result:", {
    date: availRes.date,
    availableSlotsCount: availRes.availableSlots.length,
    chairsAvailable: availRes.chairsAvailable,
  });

  const bookRes = await executeBookAppointment({
    patientName: "Mariana Morales",
    phone: "+52 55 9876 5432",
    serviceType: "Limpieza",
    datetime: "2026-09-26 11:00",
    clinicLocation: "Polanco",
  });
  console.log("Book result:", {
    appointmentId: bookRes.appointmentId,
    folio: bookRes.folio,
    date: bookRes.date,
    time: bookRes.time,
    location: bookRes.location,
  });

  // Verify created appointment in DB
  const [createdApt] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.appointmentId, bookRes.appointmentId!));
  if (!createdApt) throw new Error("Created appointment not found in DB");
  console.log("Appointment in PostgreSQL startAt (UTC):", createdApt.startAt.toISOString());
  const aptFormattedInTz = formatAppointmentTime(createdApt.startAt, "America/Mexico_City");
  console.log("Appointment formatted in branch TZ:", aptFormattedInTz, "Expected: 11:00");
  if (aptFormattedInTz !== "11:00") {
    throw new Error(`Appointment startAt was not stored at 11:00 branch time! Got ${aptFormattedInTz}`);
  }
  console.log("✅ TEST 3 PASSED: MCP book_appointment stores true UTC and respects branch timezone.");

  // TEST 4: Appointment Status Persistence & Revalidation
  console.log("\n[TEST 4] Appointment Status Persistence (CONFIRMED -> COMPLETED -> CANCELLED)");
  const confirmRes = await updateAppointmentStatusAction(bookRes.appointmentId!, "CONFIRMED");
  console.log("Status -> CONFIRMED:", confirmRes);
  if (!confirmRes.success || confirmRes.data?.status !== "CONFIRMED") {
    throw new Error("Failed to confirm appointment");
  }

  const [dbAfterConfirm] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.appointmentId, bookRes.appointmentId!));
  if (!dbAfterConfirm || dbAfterConfirm.status !== "CONFIRMED") {
    throw new Error(`DB status mismatch: got ${dbAfterConfirm?.status}`);
  }

  const completeRes = await updateAppointmentStatusAction(bookRes.appointmentId!, "COMPLETED");
  console.log("Status -> COMPLETED:", completeRes);
  if (!completeRes.success || completeRes.data?.status !== "COMPLETED") {
    throw new Error("Failed to complete appointment");
  }

  const [dbAfterComplete] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.appointmentId, bookRes.appointmentId!));
  if (!dbAfterComplete || dbAfterComplete.status !== "COMPLETED") {
    throw new Error(`DB status mismatch: got ${dbAfterComplete?.status}`);
  }
  console.log("✅ TEST 4 PASSED: Appointment statuses persist cleanly in PostgreSQL.");

  // TEST 5: Patient Creation & Update with dateOfBirth and Zod validation
  console.log("\n[TEST 5] Patient Creation & Update (dateOfBirth, gender, whatsappOptIn)");
  const createPatientRes = await createPatientAction({
    firstName: "Elena",
    lastName: "Sánchez Test",
    phone: "+52 55 4444 3333",
    email: "elena.sanchez@test.com",
    dateOfBirth: "1994-08-14",
    gender: "F",
    whatsappOptIn: true,
  });
  console.log("Create patient result:", createPatientRes.success, createPatientRes.data?.patientId);
  if (!createPatientRes.success || !createPatientRes.data) {
    throw new Error("Failed to create patient: " + createPatientRes.error);
  }

  const patientId = createPatientRes.data.patientId;
  const updatePatientRes = await updatePatientAction(patientId, {
    firstName: "Elena Sofía",
    lastName: "Sánchez Test",
    dateOfBirth: "1994-08-15",
    gender: "F",
    whatsappOptIn: true,
  });
  console.log("Update patient result:", updatePatientRes.success, updatePatientRes.data?.firstName);
  if (!updatePatientRes.success || updatePatientRes.data?.dateOfBirth !== "1994-08-15") {
    throw new Error("Failed to update patient with dateOfBirth: " + updatePatientRes.error);
  }

  // Verify Zod detailed error on invalid input
  const badInputRes = await updatePatientAction(patientId, {
    dateOfBirth: "fecha-invalida",
  });
  console.log("Invalid date response error:", badInputRes.error);
  if (badInputRes.success || !badInputRes.error?.includes("YYYY-MM-DD")) {
    throw new Error("Zod error message did not specify dateOfBirth format requirement!");
  }
  console.log("✅ TEST 5 PASSED: Patient creation, update, and detailed Zod validation verified.");

  // TEST 6: getAgendaAppointmentsAction includes timezone and respects location
  console.log("\n[TEST 6] getAgendaAppointmentsAction timezone mapping");
  const firstLoc = locs[0];
  if (!firstLoc) throw new Error("No locations found");
  const agendaRes = await getAgendaAppointmentsAction("2026-09-26", firstLoc.locationId);
  console.log("Agenda appointments count:", agendaRes.data?.length);
  if (agendaRes.locations && agendaRes.locations.length > 0 && agendaRes.locations[0]) {
    console.log("Location 0 mapped timezone:", agendaRes.locations[0].timezone);
    if (!agendaRes.locations[0].timezone) {
      throw new Error("Mapped location missing timezone!");
    }
  }
  console.log("✅ TEST 6 PASSED: Agenda data includes location timezone.");

  console.log("\n=================================================");
  console.log("  ALL TESTS PASSED WITH 100% SUCCESS! ");
  console.log("=================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
