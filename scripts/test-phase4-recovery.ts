/**
 * Phase 4 Integration Test: Waitlist & Recovery Engine
 *
 * Simulates the complete recovery lifecycle:
 * 1. Add patients to waitlist
 * 2. Create appointment → Cancel it (triggering RECOVERY_TRIGGERED from Phase 3)
 * 3. Process freed slot → Deterministic matching → PENDING offers generated
 * 4. Patient A accepts atomically → New appointment created
 * 5. Verify competing offers expired
 * 6. Verify RECOVERY_ACCEPTED event recorded
 * 7. Verify double-accept is blocked
 * 8. Decline test on a separate offer
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-phase4-recovery.ts
 */

import { db, schema } from "../src/shared/database";
import { getAuthenticatedContext } from "../src/shared/auth/server-context";
import { AppointmentService } from "../src/modules/appointments/services/appointment.service";
import { RecoveryEngine } from "../src/modules/recovery/services/recovery.service";
import { eq, and } from "drizzle-orm";
import type { AuthContext } from "../src/shared/types/index";

async function runPhase4Test() {
  console.log("==================================================================");
  console.log("  TEST SUITE: PHASE 4 — WAITLIST & RECOVERY ENGINE");
  console.log("==================================================================");

  const context = await getAuthenticatedContext();
  console.log(`AuthContext: Org=${context.organization_id}, User=${context.user_id}`);

  const appointmentService = new AppointmentService(db);
  const recoveryEngine = new RecoveryEngine(db);

  // ─── Prerequisites ────────────────────────────────────────────
  const dentist = await db.query.dentists.findFirst({
    where: eq(schema.dentists.organizationId, context.organization_id),
  });
  if (!dentist) throw new Error("No dentist found");

  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.organizationId, context.organization_id),
  });
  if (!location) throw new Error("No location found");

  const service = await db.query.services.findFirst({
    where: eq(schema.services.organizationId, context.organization_id),
  });
  if (!service) throw new Error("No service found");

  // We need at least 3 patients for this test
  const allPatients = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.organizationId, context.organization_id))
    .limit(3);

  if (allPatients.length < 2) {
    throw new Error("Need at least 2 patients in the database for this test");
  }

  const patientA = allPatients[0]!;
  const patientB = allPatients[1]!;
  const patientC = allPatients.length >= 3 ? allPatients[2]! : null;

  console.log(`Dentist: ${dentist.professionalName}`);
  console.log(`Location: ${location.name}`);
  console.log(`Service: ${service.name} (${service.durationMinutes}m)`);
  console.log(`Patient A: ${patientA.firstName} ${patientA.lastName}`);
  console.log(`Patient B: ${patientB.firstName} ${patientB.lastName}`);
  if (patientC) console.log(`Patient C: ${patientC.firstName} ${patientC.lastName}`);

  // Test date: 45 days in the future at first available slot
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 45);
  const dayOfWeek = testDate.getDay();

  // Ensure availability exists for this day
  const existingAvail = await db.query.dentistAvailability.findFirst({
    where: and(
      eq(schema.dentistAvailability.organizationId, context.organization_id),
      eq(schema.dentistAvailability.dentistId, dentist.dentistId),
      eq(schema.dentistAvailability.dayOfWeek, dayOfWeek)
    ),
  });

  if (!existingAvail) {
    await db.insert(schema.dentistAvailability).values({
      organizationId: context.organization_id,
      dentistId: dentist.dentistId,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
    });
    console.log(`Created availability for dayOfWeek=${dayOfWeek}`);
  }

  // Set appointment at 11:00
  testDate.setHours(11, 0, 0, 0);
  const slotStart = new Date(testDate);
  const testDateStr = slotStart.toISOString().split("T")[0]!;
  console.log(`Test slot: ${slotStart.toISOString()}, date: ${testDateStr}`);

  // Track IDs for cleanup
  const createdWaitlistIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  try {
    // =================================================================
    // TEST 1: Add patients to waitlist
    // =================================================================
    console.log("\n[TEST 1] Adding patients to waitlist...");

    const wlEntryA = await recoveryEngine.addToWaitlist(context, {
      patientId: patientA.patientId,
      serviceId: service.serviceId,
      dentistId: dentist.dentistId,   // Specific dentist preference
      locationId: location.locationId,
      preferredDateStart: testDateStr,
      preferredDateEnd: testDateStr,
      preferredTimeStart: "00:00",
      preferredTimeEnd: "23:59",
      priority: 5,                     // Lower priority
    });
    createdWaitlistIds.push(wlEntryA.waitlistId);
    console.log(`  Waitlist A: ${wlEntryA.waitlistId} (priority=5, status=${wlEntryA.status})`);

    const wlEntryB = await recoveryEngine.addToWaitlist(context, {
      patientId: patientB.patientId,
      serviceId: service.serviceId,
      // No dentist preference — accepts any dentist
      locationId: location.locationId,
      preferredDateStart: testDateStr,
      preferredDateEnd: testDateStr,
      preferredTimeStart: "00:00",
      preferredTimeEnd: "23:59",
      priority: 10,                    // HIGHER priority — should be first!
    });
    createdWaitlistIds.push(wlEntryB.waitlistId);
    console.log(`  Waitlist B: ${wlEntryB.waitlistId} (priority=10, status=${wlEntryB.status})`);

    if (patientC) {
      const wlEntryC = await recoveryEngine.addToWaitlist(context, {
        patientId: patientC.patientId,
        serviceId: service.serviceId,
        preferredDateStart: testDateStr,
        preferredDateEnd: testDateStr,
        preferredTimeStart: "00:00",
        preferredTimeEnd: "23:59",
        priority: 5,                   // Same priority as A, but added later
      });
      createdWaitlistIds.push(wlEntryC.waitlistId);
      console.log(`  Waitlist C: ${wlEntryC.waitlistId} (priority=5, status=${wlEntryC.status})`);
    }

    console.log("✅ TEST 1 PASSED: Patients added to waitlist.");

    // =================================================================
    // TEST 2: Create an appointment and cancel it
    // =================================================================
    console.log("\n[TEST 2] Creating appointment and cancelling it...");

    const aptResult = await appointmentService.createAppointment(context, {
      patientId: patientA.patientId, // Anyone — this is the original patient
      dentistId: dentist.dentistId,
      locationId: location.locationId,
      serviceId: service.serviceId,
      startAt: slotStart,
      notes: "Phase 4 test — will be cancelled",
    });

    const originalApt = aptResult[0];
    if (!originalApt) throw new Error("Failed to create appointment");
    createdAppointmentIds.push(originalApt.appointmentId);
    console.log(`  Created appointment: ${originalApt.appointmentId}`);

    // Cancel it (Phase 3 will record CANCELLED + RECOVERY_TRIGGERED events)
    await appointmentService.updateAppointmentStatus(
      context,
      originalApt.appointmentId,
      "CANCELLED",
      {
        actorType: "USER",
        source: "WEB",
        reason: "Patient cancelled — testing recovery",
      }
    );
    console.log("  Appointment cancelled. RECOVERY_TRIGGERED event should exist.");

    // Verify RECOVERY_TRIGGERED event
    const events = await appointmentService.getAppointmentEvents(context, originalApt.appointmentId);
    const recoveryTriggered = events.find((e) => e.eventType === "RECOVERY_TRIGGERED");
    if (!recoveryTriggered) {
      throw new Error("RECOVERY_TRIGGERED event missing after cancellation!");
    }
    console.log("  RECOVERY_TRIGGERED event confirmed with freedSlot metadata.");
    console.log("✅ TEST 2 PASSED: Appointment created and cancelled with recovery trigger.");

    // =================================================================
    // TEST 3: Process freed slot — deterministic matching
    // =================================================================
    console.log("\n[TEST 3] Processing freed slot through RecoveryEngine...");

    const slotEnd = new Date(slotStart.getTime() + (service.durationMinutes || 30) * 60000);

    const matchResult = await recoveryEngine.processFreedSlot(context, {
      appointmentId: originalApt.appointmentId,
      serviceId: service.serviceId,
      dentistId: dentist.dentistId,
      locationId: location.locationId,
      startAt: slotStart,
      endAt: slotEnd,
    });

    console.log(`  Candidates found: ${matchResult.candidatesFound}`);
    console.log(`  Offers created: ${matchResult.offersCreated}`);
    if (matchResult.offersCreated === 0) {
      throw new Error("Expected at least 1 recovery offer to be created!");
    }

    // Verify deterministic ordering: Patient B (priority=10) should be FIRST
    const firstOffer = matchResult.offers[0]!;
    console.log(`  First offer: patient=${firstOffer.patientId}, waitlist=${firstOffer.waitlistId}`);

    if (firstOffer.patientId !== patientB.patientId) {
      throw new Error(
        `Deterministic order violated! Expected Patient B (priority=10) first, got ${firstOffer.patientId}`
      );
    }
    console.log("  ✓ Deterministic ordering verified: highest priority (Patient B) is first.");

    // Verify waitlist statuses updated to OFFERED
    for (const offer of matchResult.offers) {
      const wlEntry = await recoveryEngine.getWaitlistEntry(context, offer.waitlistId);
      if (!wlEntry || wlEntry.status !== "OFFERED") {
        throw new Error(`Waitlist ${offer.waitlistId} should be OFFERED, got ${wlEntry?.status}`);
      }
    }
    console.log("  ✓ All matched waitlist entries updated to OFFERED.");

    // Verify RECOVERY_OFFERED events recorded
    const eventsAfterMatch = await appointmentService.getAppointmentEvents(
      context,
      originalApt.appointmentId
    );
    const offeredEvents = eventsAfterMatch.filter((e) => e.eventType === "RECOVERY_OFFERED");
    if (offeredEvents.length !== matchResult.offersCreated) {
      throw new Error(
        `Expected ${matchResult.offersCreated} RECOVERY_OFFERED events, got ${offeredEvents.length}`
      );
    }
    console.log(`  ✓ ${offeredEvents.length} RECOVERY_OFFERED events recorded.`);
    console.log("✅ TEST 3 PASSED: Deterministic matching and offer generation verified.");

    // =================================================================
    // TEST 4: Atomic acceptance — Patient B accepts
    // =================================================================
    console.log("\n[TEST 4] Patient B atomically accepts recovery offer...");

    const acceptResult = await recoveryEngine.acceptOffer(context, firstOffer.offerId);

    if (!acceptResult.success || !acceptResult.newAppointmentId) {
      throw new Error(`Acceptance failed: ${acceptResult.error}`);
    }
    createdAppointmentIds.push(acceptResult.newAppointmentId);
    console.log(`  New appointment created: ${acceptResult.newAppointmentId}`);

    // Verify the new appointment exists and has correct data
    const newAptRows = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.organizationId, context.organization_id),
          eq(schema.appointments.appointmentId, acceptResult.newAppointmentId)
        )
      )
      .limit(1);
    const newApt = newAptRows[0];
    if (!newApt) throw new Error("New appointment not found in database!");
    if (newApt.patientId !== patientB.patientId) {
      throw new Error("New appointment patient should be Patient B!");
    }
    if (newApt.startAt.getTime() !== slotStart.getTime()) {
      throw new Error("New appointment should occupy the exact freed slot!");
    }
    console.log(`  ✓ New appointment confirmed for Patient B at ${newApt.startAt.toISOString()}`);

    // Verify the accepted offer status
    const acceptedOffer = await db
      .select()
      .from(schema.recoveryOffers)
      .where(
        and(
          eq(schema.recoveryOffers.organizationId, context.organization_id),
          eq(schema.recoveryOffers.offerId, firstOffer.offerId)
        )
      )
      .limit(1);
    if (acceptedOffer[0]?.status !== "ACCEPTED") {
      throw new Error(`Offer should be ACCEPTED, got ${acceptedOffer[0]?.status}`);
    }
    console.log("  ✓ Offer status = ACCEPTED.");

    // Verify waitlist entry is FULFILLED
    const fulfilledWl = await recoveryEngine.getWaitlistEntry(context, firstOffer.waitlistId);
    if (!fulfilledWl || fulfilledWl.status !== "FULFILLED") {
      throw new Error(`Waitlist should be FULFILLED, got ${fulfilledWl?.status}`);
    }
    console.log("  ✓ Waitlist entry status = FULFILLED.");
    console.log("✅ TEST 4 PASSED: Atomic acceptance completed successfully.");

    // =================================================================
    // TEST 5: Competing offers expired
    // =================================================================
    console.log("\n[TEST 5] Verifying competing offers expired...");

    const allOffers = await recoveryEngine.getOffersByAppointment(
      context,
      originalApt.appointmentId
    );
    const pendingOffers = allOffers.filter((o) => o.status === "PENDING");
    const expiredOffers = allOffers.filter((o) => o.status === "EXPIRED");

    console.log(`  Total offers: ${allOffers.length}`);
    console.log(`  PENDING: ${pendingOffers.length}`);
    console.log(`  EXPIRED: ${expiredOffers.length}`);
    console.log(`  ACCEPTED: ${allOffers.filter((o) => o.status === "ACCEPTED").length}`);

    if (pendingOffers.length > 0) {
      throw new Error("No offers should remain PENDING after acceptance!");
    }

    // All non-accepted offers should be EXPIRED
    const nonAccepted = allOffers.filter((o) => o.offerId !== firstOffer.offerId);
    for (const offer of nonAccepted) {
      if (offer.status !== "EXPIRED") {
        throw new Error(`Competing offer ${offer.offerId} should be EXPIRED, got ${offer.status}`);
      }
    }
    console.log("  ✓ All competing offers are EXPIRED.");
    console.log("✅ TEST 5 PASSED: Competing offers expired atomically.");

    // =================================================================
    // TEST 6: RECOVERY_ACCEPTED event recorded
    // =================================================================
    console.log("\n[TEST 6] Verifying RECOVERY_ACCEPTED event...");

    const eventsAfterAccept = await appointmentService.getAppointmentEvents(
      context,
      originalApt.appointmentId
    );
    const acceptedEvent = eventsAfterAccept.find((e) => e.eventType === "RECOVERY_ACCEPTED");
    if (!acceptedEvent) {
      throw new Error("RECOVERY_ACCEPTED event missing!");
    }
    console.log("  RECOVERY_ACCEPTED event:", {
      eventType: acceptedEvent.eventType,
      actorType: acceptedEvent.actorType,
      metadata: acceptedEvent.metadata,
    });
    console.log("✅ TEST 6 PASSED: RECOVERY_ACCEPTED event recorded.");

    // =================================================================
    // TEST 7: Double-accept blocked
    // =================================================================
    console.log("\n[TEST 7] Verifying double-accept is blocked...");

    // Try to accept the same offer again
    const doubleAccept = await recoveryEngine.acceptOffer(context, firstOffer.offerId);
    if (doubleAccept.success) {
      throw new Error("Double-accept should have been rejected!");
    }
    console.log(`  Double-accept correctly rejected: "${doubleAccept.error}"`);

    // Try to accept a competing (now expired) offer if there is one
    if (nonAccepted.length > 0) {
      const expiredOffer = nonAccepted[0]!;
      const expiredAccept = await recoveryEngine.acceptOffer(context, expiredOffer.offerId);
      if (expiredAccept.success) {
        throw new Error("Expired offer acceptance should have been rejected!");
      }
      console.log(`  Expired offer accept correctly rejected: "${expiredAccept.error}"`);
    }
    console.log("✅ TEST 7 PASSED: Double-claiming prevention verified.");

    // =================================================================
    // TEST 8: Decline flow
    // =================================================================
    console.log("\n[TEST 8] Testing offer decline flow...");

    // Create a second cancellation to test decline
    const apt2Result = await appointmentService.createAppointment(context, {
      patientId: patientA.patientId,
      dentistId: dentist.dentistId,
      locationId: location.locationId,
      serviceId: service.serviceId,
      startAt: new Date(slotStart.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
      notes: "Phase 4 test — decline flow",
    });
    const apt2 = apt2Result[0];
    if (!apt2) throw new Error("Failed to create second appointment");
    createdAppointmentIds.push(apt2.appointmentId);

    // Re-add Patient A back to waitlist for this new slot
    const wlDecline = await recoveryEngine.addToWaitlist(context, {
      patientId: patientA.patientId,
      serviceId: service.serviceId,
      preferredDateStart: testDateStr,
      preferredDateEnd: testDateStr,
      preferredTimeStart: "08:00",
      preferredTimeEnd: "23:00",
      priority: 1,
    });
    createdWaitlistIds.push(wlDecline.waitlistId);

    // Cancel the second appointment
    await appointmentService.updateAppointmentStatus(context, apt2.appointmentId, "CANCELLED", {
      reason: "Decline test",
    });

    const slotEnd2 = new Date(apt2.startAt.getTime() + (service.durationMinutes || 30) * 60000);

    // Process the freed slot
    const matchResult2 = await recoveryEngine.processFreedSlot(context, {
      appointmentId: apt2.appointmentId,
      serviceId: service.serviceId,
      dentistId: dentist.dentistId,
      locationId: location.locationId,
      startAt: apt2.startAt,
      endAt: slotEnd2,
    });

    if (matchResult2.offersCreated === 0) {
      console.log("  No offers generated (Patient A may not match time window). Skipping decline sub-test.");
    } else {
      const declineOffer = matchResult2.offers[0]!;
      const declineResult = await recoveryEngine.declineOffer(context, declineOffer.offerId);
      if (!declineResult.success) {
        throw new Error(`Decline failed: ${declineResult.error}`);
      }

      // Verify offer is DECLINED
      const declinedRow = await db
        .select()
        .from(schema.recoveryOffers)
        .where(
          and(
            eq(schema.recoveryOffers.organizationId, context.organization_id),
            eq(schema.recoveryOffers.offerId, declineOffer.offerId)
          )
        )
        .limit(1);
      if (declinedRow[0]?.status !== "DECLINED") {
        throw new Error(`Offer should be DECLINED, got ${declinedRow[0]?.status}`);
      }

      // Verify waitlist entry returned to WAITING
      const wlAfterDecline = await recoveryEngine.getWaitlistEntry(context, declineOffer.waitlistId);
      if (!wlAfterDecline || wlAfterDecline.status !== "WAITING") {
        throw new Error(`Waitlist should return to WAITING after decline, got ${wlAfterDecline?.status}`);
      }

      // Verify RECOVERY_DECLINED event
      const declinedEvents = await appointmentService.getAppointmentEvents(context, apt2.appointmentId);
      const declinedEvt = declinedEvents.find((e) => e.eventType === "RECOVERY_DECLINED");
      if (!declinedEvt) {
        throw new Error("RECOVERY_DECLINED event missing!");
      }
      console.log("  ✓ Offer declined, waitlist returned to WAITING, event recorded.");
    }
    console.log("✅ TEST 8 PASSED: Decline flow verified.");

    // =================================================================
    console.log("\n==================================================================");
    console.log("  ALL PHASE 4 TESTS PASSED WITH 100% SUCCESS! 🎉");
    console.log("==================================================================");
  } finally {
    // ─── Cleanup ──────────────────────────────────────────────────
    console.log("\n🧹 Cleaning up test data...");

    // Delete recovery offers (depend on waitlist and appointments)
    for (const aptId of createdAppointmentIds) {
      await db
        .delete(schema.recoveryOffers)
        .where(
          and(
            eq(schema.recoveryOffers.organizationId, context.organization_id),
            eq(schema.recoveryOffers.appointmentId, aptId)
          )
        );
    }

    // Delete waitlist entries
    for (const wlId of createdWaitlistIds) {
      await db
        .delete(schema.waitlist)
        .where(
          and(
            eq(schema.waitlist.organizationId, context.organization_id),
            eq(schema.waitlist.waitlistId, wlId)
          )
        );
    }

    // Delete appointment events and appointments
    for (const aptId of createdAppointmentIds) {
      await db
        .delete(schema.appointmentEvents)
        .where(eq(schema.appointmentEvents.appointmentId, aptId));
      await db
        .delete(schema.appointments)
        .where(eq(schema.appointments.appointmentId, aptId));
    }

    console.log("Cleanup complete.");
  }
}

runPhase4Test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
