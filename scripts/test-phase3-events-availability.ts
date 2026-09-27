import { db, schema } from "../src/shared/database";
import { getAuthenticatedContext } from "../src/shared/auth/server-context";
import { AppointmentService } from "../src/modules/appointments/services/appointment.service";
import { AvailabilityService } from "../src/modules/availability/services/availability.service";
import { eq, and, desc } from "drizzle-orm";

async function runPhase3Verification() {
  console.log("==================================================================");
  console.log("  TEST SUITE: PHASE 3 - CANCELLATION AVAILABILITY & EVENTS");
  console.log("==================================================================");

  const context = await getAuthenticatedContext();
  console.log(`Using AuthContext: Org ID = ${context.organization_id}, User ID = ${context.user_id}`);

  const appointmentService = new AppointmentService(db);
  const availabilityService = new AvailabilityService(db);

  // 1. Fetch prerequisite entities (Dentist, Location, Patient, Service)
  const dentist = await db.query.dentists.findFirst({
    where: eq(schema.dentists.organizationId, context.organization_id),
  });
  if (!dentist) throw new Error("No dentist found for organization");

  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.organizationId, context.organization_id),
  });
  if (!location) throw new Error("No location found for organization");

  const service = await db.query.services.findFirst({
    where: eq(schema.services.organizationId, context.organization_id),
  });
  if (!service) throw new Error("No service found for organization");

  const patient = await db.query.patients.findFirst({
    where: eq(schema.patients.organizationId, context.organization_id),
  });
  if (!patient) throw new Error("No patient found for organization");

  console.log(`Prerequisites OK: Dentist="${dentist.professionalName}", Service="${service.name}" (${service.durationMinutes}m), Location="${location.name}"`);

  // Target date for test: 30 days in future at 10:00 local
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 30);
  const dayOfWeek = testDate.getDay();

  // Ensure dentist has availability window for this day of week
  const existingAvail = await db.query.dentistAvailability.findFirst({
    where: and(
      eq(schema.dentistAvailability.organizationId, context.organization_id),
      eq(schema.dentistAvailability.dentistId, dentist.dentistId),
      eq(schema.dentistAvailability.dayOfWeek, dayOfWeek)
    ),
  });

  if (!existingAvail) {
    console.log(`Setting up recurring availability for dayOfWeek ${dayOfWeek} (09:00 - 18:00)...`);
    await db.insert(schema.dentistAvailability).values({
      organizationId: context.organization_id,
      dentistId: dentist.dentistId,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
    });
  }

  // -------------------------------------------------------------
  // STEP 1: Check initial availability
  // -------------------------------------------------------------
  console.log("\n[STEP 1] Checking initial availability for test date...");
  const initialSlots = await availabilityService.getAvailableSlots(
    context,
    dentist.dentistId,
    testDate,
    service.serviceId
  );
  console.log("Initial available slots count:", initialSlots.slots.length);
  if (initialSlots.slots.length === 0) {
    throw new Error("No initial slots generated for test date!");
  }
  const targetSlotStr = initialSlots.slots[0]!; // e.g. "09:00"
  console.log(`Selecting target slot: "${targetSlotStr}"`);

  // Parse target slot hour/min into testDate
  const [slotH, slotM] = targetSlotStr.split(":").map(Number);
  testDate.setHours(slotH ?? 9, slotM ?? 0, 0, 0);
  const slotStart = new Date(testDate);
  const slotEnd = new Date(slotStart.getTime() + (service.durationMinutes || 30) * 60000);

  console.log(`Test slot window: ${slotStart.toISOString()} to ${slotEnd.toISOString()}`);

  let firstAppointmentId: string | null = null;
  let rebookedAppointmentId: string | null = null;

  try {
    // -------------------------------------------------------------
    // STEP 2: Create appointment & verify CREATED event
    // -------------------------------------------------------------
    console.log("\n[STEP 2] Creating first appointment via AppointmentService...");
    const createRes = await appointmentService.createAppointment(
      context,
      {
        patientId: patient.patientId,
        dentistId: dentist.dentistId,
        locationId: location.locationId,
        serviceId: service.serviceId,
        startAt: slotStart,
        notes: "Test Phase 3 slot cancellation",
      },
      {
        source: "WEB",
        actorType: "USER",
        metadata: { testSuite: "phase3_verification" },
      }
    );

    const firstApt = createRes[0];
    if (!firstApt) throw new Error("Failed to create appointment!");
    firstAppointmentId = firstApt.appointmentId;
    console.log(`Appointment created with ID: ${firstAppointmentId}, Status: ${firstApt.status}`);

    // Verify CREATED event in appointment_events
    const eventsAfterCreate = await appointmentService.getAppointmentEvents(context, firstAppointmentId);
    console.log("Events count after creation:", eventsAfterCreate.length);
    if (eventsAfterCreate.length === 0 || eventsAfterCreate[0]?.eventType !== "CREATED") {
      throw new Error(`Expected CREATED event, found: ${JSON.stringify(eventsAfterCreate)}`);
    }
    console.log("CREATED event verified:", {
      eventType: eventsAfterCreate[0].eventType,
      actorType: eventsAfterCreate[0].actorType,
      source: eventsAfterCreate[0].source,
      metadata: eventsAfterCreate[0].metadata,
    });
    console.log("✅ STEP 2 PASSED: Appointment and CREATED event recorded atomically.");

    // -------------------------------------------------------------
    // STEP 3: Verify slot is now OCCUPIED & double-booking is blocked
    // -------------------------------------------------------------
    console.log("\n[STEP 3] Verifying slot is occupied and conflict detection triggers...");
    const bookedSlots = await availabilityService.getAvailableSlots(
      context,
      dentist.dentistId,
      testDate,
      service.serviceId
    );
    if (bookedSlots.slots.includes(targetSlotStr)) {
      throw new Error(`Slot ${targetSlotStr} should NOT be available while active appointment exists!`);
    }
    console.log(`Slot ${targetSlotStr} correctly omitted from availability.`);

    // Attempting to book in the same slot must fail
    let conflictBlocked = false;
    try {
      await appointmentService.createAppointment(context, {
        patientId: patient.patientId,
        dentistId: dentist.dentistId,
        locationId: location.locationId,
        serviceId: service.serviceId,
        startAt: slotStart,
        notes: "Double-booking attempt",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("overlaps with an existing appointment")) {
        conflictBlocked = true;
        console.log("Double booking correctly blocked by application layer:", err.message);
      } else {
        throw err;
      }
    }
    if (!conflictBlocked) {
      throw new Error("Expected overlap exception when double-booking active slot!");
    }
    console.log("✅ STEP 3 PASSED: Active appointment successfully blocks double-booking.");

    // -------------------------------------------------------------
    // STEP 4: Confirm appointment & verify CONFIRMED event
    // -------------------------------------------------------------
    console.log("\n[STEP 4] Updating status to CONFIRMED...");
    await appointmentService.updateAppointmentStatus(
      context,
      firstAppointmentId,
      "CONFIRMED",
      {
        source: "WHATSAPP",
        reason: "Patient confirmed via WhatsApp template reply",
      }
    );

    const eventsAfterConfirm = await appointmentService.getAppointmentEvents(context, firstAppointmentId);
    console.log("Total events after confirmation:", eventsAfterConfirm.length);
    const confirmedEvent = eventsAfterConfirm.find((e) => e.eventType === "CONFIRMED");
    if (!confirmedEvent) {
      throw new Error("CONFIRMED event not found in appointment_events!");
    }
    console.log("CONFIRMED event verified:", {
      eventType: confirmedEvent.eventType,
      source: confirmedEvent.source,
      metadata: confirmedEvent.metadata,
    });
    console.log("✅ STEP 4 PASSED: Status update recorded in appointment_events.");

    // -------------------------------------------------------------
    // STEP 5: Cancel appointment & verify CANCELLED and RECOVERY_TRIGGERED events
    // -------------------------------------------------------------
    console.log("\n[STEP 5] Cancelling appointment...");
    await appointmentService.updateAppointmentStatus(
      context,
      firstAppointmentId,
      "CANCELLED",
      {
        actorType: "USER",
        source: "WEB",
        reason: "Patient called to cancel due to schedule conflict",
      }
    );

    const eventsAfterCancel = await appointmentService.getAppointmentEvents(context, firstAppointmentId);
    console.log("Total events after cancellation:", eventsAfterCancel.length);

    const cancelledEvent = eventsAfterCancel.find((e) => e.eventType === "CANCELLED");
    const recoveryEvent = eventsAfterCancel.find((e) => e.eventType === "RECOVERY_TRIGGERED");

    if (!cancelledEvent) {
      throw new Error("CANCELLED event missing from appointment_events!");
    }
    if (!recoveryEvent) {
      throw new Error("RECOVERY_TRIGGERED event missing from appointment_events!");
    }

    console.log("CANCELLED event verified:", {
      eventType: cancelledEvent.eventType,
      actorType: cancelledEvent.actorType,
      metadata: cancelledEvent.metadata,
    });
    console.log("RECOVERY_TRIGGERED event verified:", {
      eventType: recoveryEvent.eventType,
      actorType: recoveryEvent.actorType,
      metadata: recoveryEvent.metadata,
    });
    console.log("✅ STEP 5 PASSED: Cancellation atomically logged CANCELLED & RECOVERY_TRIGGERED events.");

    // -------------------------------------------------------------
    // STEP 6: Verify freed slot is REPORTED AS AVAILABLE again
    // -------------------------------------------------------------
    console.log("\n[STEP 6] Checking availability after cancellation...");
    const slotsAfterCancel = await availabilityService.getAvailableSlots(
      context,
      dentist.dentistId,
      testDate,
      service.serviceId
    );
    if (!slotsAfterCancel.slots.includes(targetSlotStr)) {
      throw new Error(`Slot ${targetSlotStr} MUST be available after appointment cancellation!`);
    }
    console.log(`Slot ${targetSlotStr} successfully restored to available slots list.`);
    console.log("✅ STEP 6 PASSED: Cancelled slot is immediately visible as free.");

    // -------------------------------------------------------------
    // STEP 7: Re-book in the exact same slot without conflict
    // -------------------------------------------------------------
    console.log("\n[STEP 7] Re-booking the freed slot with a new appointment...");
    const rebookRes = await appointmentService.createAppointment(
      context,
      {
        patientId: patient.patientId,
        dentistId: dentist.dentistId,
        locationId: location.locationId,
        serviceId: service.serviceId,
        startAt: slotStart,
        notes: "Rebooking slot after cancellation",
      },
      {
        source: "WEB",
        metadata: { rebookedAfterId: firstAppointmentId },
      }
    );

    const rebookedApt = rebookRes[0];
    if (!rebookedApt) throw new Error("Failed to rebook appointment!");
    rebookedAppointmentId = rebookedApt.appointmentId;
    console.log(`Re-booked appointment created with ID: ${rebookedAppointmentId}, Status: ${rebookedApt.status}`);

    const rebookedEvents = await appointmentService.getAppointmentEvents(context, rebookedAppointmentId);
    console.log("Rebooked appointment events count:", rebookedEvents.length);
    if (rebookedEvents.length === 0 || rebookedEvents[0]?.eventType !== "CREATED") {
      throw new Error("Expected CREATED event for rebooked appointment!");
    }
    console.log("✅ STEP 7 PASSED: Slot successfully re-booked without conflict!");

    console.log("\n==================================================================");
    console.log("  ALL PHASE 3 REQUIREMENTS FULLY VERIFIED WITH 100% SUCCESS!");
    console.log("==================================================================");
  } finally {
    // Cleanup test appointments and events
    console.log("\n🧹 Cleaning up test appointments and events...");
    if (rebookedAppointmentId) {
      await db.delete(schema.appointmentEvents).where(eq(schema.appointmentEvents.appointmentId, rebookedAppointmentId));
      await db.delete(schema.appointments).where(eq(schema.appointments.appointmentId, rebookedAppointmentId));
    }
    if (firstAppointmentId) {
      await db.delete(schema.appointmentEvents).where(eq(schema.appointmentEvents.appointmentId, firstAppointmentId));
      await db.delete(schema.appointments).where(eq(schema.appointments.appointmentId, firstAppointmentId));
    }
    console.log("Cleanup complete.");
  }
}

runPhase3Verification().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
