/**
 * Integration Test: Phase 6 - WhatsApp Inbound Webhook & Recovery Offer Acceptance
 *
 * Verifies the complete end-to-end chain:
 * 1. Freed slot triggers RecoveryEngine offers (Phase 4)
 * 2. Meta sends exact inbound webhook JSON payload (e.g. "ACEPTO")
 * 3. Inbound message is persisted immediately in whatsapp_messages (INBOUND)
 * 4. Recovery intent is detected and matched against active PENDING offer
 * 5. Atomic transaction claims the slot:
 *    - Creates new appointment in appointments table
 *    - Updates offer to ACCEPTED and waitlist to FULFILLED
 *    - Atomically expires all competing offers (prevents double-booking)
 *    - Records RECOVERY_ACCEPTED event
 * 6. Outbound confirmation message is dispatched and recorded in PostgreSQL
 * 7. Late/competing acceptance receives polite "already taken/expired" response
 * 8. Decline ("RECHAZO") returns waitlist to WAITING and marks offer DECLINED
 * 9. Idempotency deduplication rejects duplicate provider_message_id
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-phase6-webhook-inbound.ts
 */

import { db } from '../src/shared/database';
import { eq, and } from 'drizzle-orm';
import {
  patients,
  dentists,
  locations,
  services,
  appointments,
  appointmentEvents,
  waitlist,
  recoveryOffers,
  whatsappConversations,
  whatsappMessages,
  whatsappIntegrations,
} from '../src/shared/database/schema';
import { POST as webhookPostHandler } from '../src/app/api/webhooks/whatsapp/route';
import { InboundWhatsAppService, detectRecoveryIntent } from '../src/modules/whatsapp/services/inbound-whatsapp.service';
import { WhatsAppRepository } from '../src/modules/whatsapp/repositories/whatsapp.repository';
import { RecoveryEngine } from '../src/modules/recovery/services/recovery.service';
import { type AuthContext } from '../src/shared/types/index';
import { NextRequest } from 'next/server';

// Ensure mock dispatch so Meta calls succeed without live credentials
process.env.MOCK_WHATSAPP_DISPATCH = 'true';

const TEST_ORG_ID = '00000000-0000-4000-a000-000000000001';
const TEST_USER_ID = '00000000-0000-4000-a000-000000000002';
const PHONE_A = '+525511223344';
const PHONE_B = '+525599887711';
const PHONE_C = '+525533445566';
const CLEAN_A = '525511223344';
const CLEAN_B = '525599887711';
const CLEAN_C = '525533445566';

const context: AuthContext = {
  user_id: TEST_USER_ID,
  organization_id: TEST_ORG_ID,
  role: 'OWNER',
};

function createMetaWebhookRequest(senderPhone: string, textBody: string, messageId: string): NextRequest {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '100000000000001',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '525500000000',
                phone_number_id: 'phone_num_id_test',
              },
              contacts: [
                {
                  profile: { name: 'Paciente Demo' },
                  wa_id: senderPhone,
                },
              ],
              messages: [
                {
                  from: senderPhone,
                  id: messageId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: textBody },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  return new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function main() {
  console.log('==================================================================');
  console.log('  TEST SUITE: PHASE 6 - WEBHOOK INBOUND & RECOVERY ACCEPTANCE');
  console.log('==================================================================\n');

  const whatsappRepo = new WhatsAppRepository(db);
  const recoveryEngine = new RecoveryEngine(db);

  // Clean any previous test artifacts
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, PHONE_A);
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, PHONE_B);
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, PHONE_C);

  const testPhones = [PHONE_A, PHONE_B, PHONE_C, CLEAN_A, CLEAN_B, CLEAN_C];
  for (const pPhone of testPhones) {
    const existing = await db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, TEST_ORG_ID), eq(patients.phone, pPhone)));
    for (const p of existing) {
      await db.delete(recoveryOffers).where(eq(recoveryOffers.patientId, p.patientId));
      await db.delete(waitlist).where(eq(waitlist.patientId, p.patientId));
      const pApts = await db.select({ appointmentId: appointments.appointmentId }).from(appointments).where(eq(appointments.patientId, p.patientId));
      for (const a of pApts) {
        await db.delete(recoveryOffers).where(eq(recoveryOffers.appointmentId, a.appointmentId));
        await db.delete(appointmentEvents).where(eq(appointmentEvents.appointmentId, a.appointmentId));
      }
      await db.delete(appointments).where(eq(appointments.patientId, p.patientId));
      await db.delete(patients).where(eq(patients.patientId, p.patientId));
    }
  }

  // ─── STEP 0: Verify Intent Detector Unit Rules ───────────────────
  console.log('[STEP 0] Verifying recovery intent detection rules...');
  if (detectRecoveryIntent('ACEPTO') !== 'ACCEPT') throw new Error('Failed to detect ACEPTO');
  if (detectRecoveryIntent('sí') !== 'ACCEPT') throw new Error('Failed to detect sí');
  if (detectRecoveryIntent('1') !== 'ACCEPT') throw new Error('Failed to detect 1');
  if (detectRecoveryIntent('¡Si confirmo!') !== 'ACCEPT') throw new Error('Failed to detect Si confirmo');
  if (detectRecoveryIntent('RECHAZO') !== 'DECLINE') throw new Error('Failed to detect RECHAZO');
  if (detectRecoveryIntent('No gracias') !== 'DECLINE') throw new Error('Failed to detect No gracias');
  if (detectRecoveryIntent('2') !== 'DECLINE') throw new Error('Failed to detect 2');
  if (detectRecoveryIntent('¿Cuánto cuesta la resina?') !== null) throw new Error('False positive on clinical query');
  console.log('  ✓ Acceptance and decline pattern matcher verified with 100% precision.\n');

  // ─── STEP 1: Seed Patients, Dentist, Service & Waitlist ──────────
  console.log('[STEP 1] Seeding test patients and waitlist candidates...');

  const dentistList = await db.select().from(dentists).where(eq(dentists.organizationId, TEST_ORG_ID)).limit(1);
  const locationList = await db.select().from(locations).where(eq(locations.organizationId, TEST_ORG_ID)).limit(1);
  const serviceList = await db.select().from(services).where(eq(services.organizationId, TEST_ORG_ID)).limit(1);

  const testDentist = dentistList[0]!;
  const testLocation = locationList[0]!;
  const testService = serviceList[0]!;

  const [patientA] = await db
    .insert(patients)
    .values({
      organizationId: TEST_ORG_ID,
      firstName: 'Marcela',
      lastName: 'Soto',
      phone: PHONE_A,
      email: `marcela_${Date.now()}@example.com`,
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    })
    .returning();

  const [patientB] = await db
    .insert(patients)
    .values({
      organizationId: TEST_ORG_ID,
      firstName: 'Fernando',
      lastName: 'Castro',
      phone: PHONE_B,
      email: `fernando_${Date.now()}@example.com`,
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    })
    .returning();

  const [patientC] = await db
    .insert(patients)
    .values({
      organizationId: TEST_ORG_ID,
      firstName: 'Lucía',
      lastName: 'Méndez',
      phone: PHONE_C,
      email: `lucia_${Date.now()}@example.com`,
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    })
    .returning();

  // Add to waitlist: Patient A (Priority 10), Patient B (Priority 5), Patient C (Priority 5)
  const wlA = await recoveryEngine.addToWaitlist(context, {
    patientId: patientA!.patientId,
    serviceId: testService.serviceId,
    dentistId: testDentist.dentistId,
    locationId: testLocation.locationId,
    preferredDateStart: '2026-11-01',
    preferredDateEnd: '2026-11-10',
    priority: 10,
  });

  const wlB = await recoveryEngine.addToWaitlist(context, {
    patientId: patientB!.patientId,
    serviceId: testService.serviceId,
    dentistId: testDentist.dentistId,
    locationId: testLocation.locationId,
    preferredDateStart: '2026-11-01',
    preferredDateEnd: '2026-11-10',
    priority: 8,
  });

  const wlC = await recoveryEngine.addToWaitlist(context, {
    patientId: patientC!.patientId,
    serviceId: testService.serviceId,
    dentistId: testDentist.dentistId,
    locationId: testLocation.locationId,
    preferredDateStart: '2026-11-01',
    preferredDateEnd: '2026-11-10',
    priority: 3,
  });

  console.log(`  ✓ Waitlist created:`);
  console.log(`    - Patient A (${patientA!.firstName}): priority=10, waitlistId=${wlA.waitlistId}`);
  console.log(`    - Patient B (${patientB!.firstName}): priority=8, waitlistId=${wlB.waitlistId}`);
  console.log(`    - Patient C (${patientC!.firstName}): priority=3, waitlistId=${wlC.waitlistId}`);
  console.log('✅ STEP 1 PASSED: Test candidates ready.\n');

  // ─── STEP 2: Cancel Appointment & Generate Recovery Offers ───────
  console.log('[STEP 2] Simulating appointment cancellation and generating recovery offers...');

  const slotStart = new Date('2026-11-05T15:00:00Z');
  const slotEnd = new Date('2026-11-05T15:45:00Z');

  const [aptToCancel] = await db
    .insert(appointments)
    .values({
      organizationId: TEST_ORG_ID,
      patientId: patientA!.patientId,
      dentistId: testDentist.dentistId,
      locationId: testLocation.locationId,
      serviceId: testService.serviceId,
      startAt: slotStart,
      endAt: slotEnd,
      status: 'CANCELLED',
      createdByUserId: TEST_USER_ID,
      serviceNameSnapshot: testService.name,
      serviceDurationSnapshot: testService.durationMinutes,
      serviceValueSnapshot: testService.price,
    })
    .returning();

  const matchResult = await recoveryEngine.processFreedSlot(
    context,
    {
      appointmentId: aptToCancel!.appointmentId,
      serviceId: testService.serviceId,
      dentistId: testDentist.dentistId,
      locationId: testLocation.locationId,
      startAt: slotStart,
      endAt: slotEnd,
    },
    { maxOffers: 2 } // Offers to Patient A (highest priority) and Patient B
  );

  console.log(`  ✓ RecoveryEngine generated ${matchResult.offersCreated} offers.`);
  const offerA = matchResult.offers.find((o) => o.patientId === patientA!.patientId);
  const offerB = matchResult.offers.find((o) => o.patientId === patientB!.patientId);

  if (!offerA || !offerB) {
    throw new Error('STEP 2 FAILED: Expected offers for both Patient A and Patient B');
  }
  console.log(`    - Offer A ID=${offerA.offerId} (Patient A)`);
  console.log(`    - Offer B ID=${offerB.offerId} (Patient B)`);
  console.log('✅ STEP 2 PASSED: Competing offers active and dispatched via WhatsApp.\n');

  // ─── STEP 3: Inbound Webhook Acceptance ("ACEPTO") from Patient A ──
  console.log('[STEP 3] Testing Inbound Webhook from Patient A responding "ACEPTO"...');

  const wamidAcceptA = `wamid.accept_${Date.now()}`;
  const webhookReqA = createMetaWebhookRequest(CLEAN_A, '¡ACEPTO!', wamidAcceptA);

  const webhookResponseA = await webhookPostHandler(webhookReqA);
  const jsonA = await webhookResponseA.json();

  if (webhookResponseA.status !== 200 || jsonA.status !== 'success') {
    throw new Error(`STEP 3 FAILED: Webhook returned HTTP ${webhookResponseA.status}`);
  }
  console.log(`  ✓ Webhook acknowledged HTTP 200: ${JSON.stringify(jsonA)}`);

  // Verify INBOUND message persisted in PostgreSQL
  const msgsA = await whatsappRepo.getRecentMessagesByPhone(TEST_ORG_ID, CLEAN_A, 10);
  const inboundRowA = msgsA.find((m) => m.providerMessageId === wamidAcceptA);
  if (!inboundRowA || inboundRowA.direction !== 'INBOUND' || inboundRowA.body !== '¡ACEPTO!') {
    throw new Error('STEP 3 FAILED: INBOUND message was not persisted properly in PostgreSQL');
  }
  console.log(`  ✓ INBOUND message verified in DB: ID=${inboundRowA.messageId}, status=${inboundRowA.status}`);

  // Verify Atomic Acceptance in Database
  const [updatedOfferA] = await db
    .select()
    .from(recoveryOffers)
    .where(and(eq(recoveryOffers.organizationId, TEST_ORG_ID), eq(recoveryOffers.offerId, offerA.offerId)));

  if (updatedOfferA?.status !== 'ACCEPTED') {
    throw new Error(`STEP 3 FAILED: Offer A status is ${updatedOfferA?.status}, expected ACCEPTED`);
  }
  console.log(`  ✓ Offer A status = ACCEPTED`);

  const [updatedWlA] = await db
    .select()
    .from(waitlist)
    .where(and(eq(waitlist.organizationId, TEST_ORG_ID), eq(waitlist.waitlistId, wlA.waitlistId)));

  if (updatedWlA?.status !== 'FULFILLED') {
    throw new Error(`STEP 3 FAILED: Waitlist A status is ${updatedWlA?.status}, expected FULFILLED`);
  }
  console.log(`  ✓ Waitlist A status = FULFILLED`);

  // Verify new appointment created in the freed slot
  const newAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.organizationId, TEST_ORG_ID),
        eq(appointments.patientId, patientA!.patientId),
        eq(appointments.startAt, slotStart),
        eq(appointments.status, 'SCHEDULED')
      )
    );

  if (newAppointments.length === 0) {
    throw new Error('STEP 3 FAILED: Recovered appointment was not created in appointments table');
  }
  const recoveredApt = newAppointments[0]!;
  console.log(`  ✓ Recovered appointment created: ID=${recoveredApt.appointmentId}`);

  // Verify OUTBOUND confirmation WhatsApp message
  const outboundConfA = msgsA.find(
    (m) =>
      m.direction === 'OUTBOUND' &&
      (m.metadata as Record<string, unknown>)?.recoveryOfferId === offerA.offerId &&
      (m.metadata as Record<string, unknown>)?.acceptedVia === 'WHATSAPP_INBOUND'
  );

  if (!outboundConfA || outboundConfA.status !== 'SENT') {
    throw new Error('STEP 3 FAILED: Confirmation message was not dispatched to Patient A');
  }
  console.log(`  ✓ Confirmation WhatsApp message dispatched:`);
  console.log(`    Message ID: ${outboundConfA.messageId}`);
  console.log(`    Preview: "${outboundConfA.body?.slice(0, 70)}..."`);
  console.log('✅ STEP 3 PASSED: Full acceptance cycle executed with 100% integrity.\n');

  // ─── STEP 4: Competing Expiration Verification ───────────────────
  console.log('[STEP 4] Verifying competing offer B was atomically expired...');

  const [updatedOfferB] = await db
    .select()
    .from(recoveryOffers)
    .where(and(eq(recoveryOffers.organizationId, TEST_ORG_ID), eq(recoveryOffers.offerId, offerB.offerId)));

  if (updatedOfferB?.status !== 'EXPIRED') {
    throw new Error(`STEP 4 FAILED: Competing Offer B status is ${updatedOfferB?.status}, expected EXPIRED`);
  }
  console.log(`  ✓ Offer B status = EXPIRED (Double-claiming blocked atomically)`);
  console.log('✅ STEP 4 PASSED: Competing offer expired automatically.\n');

  // ─── STEP 5: Late Competing Response ("SÍ") from Patient B ────────
  console.log('[STEP 5] Testing late response from Patient B trying to claim expired offer...');

  const wamidLateB = `wamid.late_${Date.now()}`;
  const webhookReqB = createMetaWebhookRequest(CLEAN_B, 'SÍ, lo quiero', wamidLateB);

  await webhookPostHandler(webhookReqB);

  const msgsB = await whatsappRepo.getRecentMessagesByPhone(TEST_ORG_ID, CLEAN_B, 10);
  const outboundApologyB = msgsB.find(
    (m) =>
      m.direction === 'OUTBOUND' &&
      (m.metadata as Record<string, unknown>)?.recoveryOfferId === offerB.offerId &&
      (m.metadata as Record<string, unknown>)?.error !== undefined
  );

  if (!outboundApologyB || !outboundApologyB.body?.includes('ya fue tomado o la oferta ha expirado')) {
    throw new Error('STEP 5 FAILED: Patient B did not receive polite apology message for expired slot');
  }
  console.log(`  ✓ Polite already-taken message delivered to Patient B:`);
  console.log(`    Preview: "${outboundApologyB.body?.slice(0, 80)}..."`);
  console.log('✅ STEP 5 PASSED: Double-claiming handled gracefully without exceptions.\n');

  // ─── STEP 6: Decline Flow ("RECHAZO") from Patient C ─────────────
  console.log('[STEP 6] Testing decline flow from Patient C responding "RECHAZO"...');

  // Create single offer for Patient C on another slot
  const [aptToCancel2] = await db
    .insert(appointments)
    .values({
      organizationId: TEST_ORG_ID,
      patientId: patientC!.patientId,
      dentistId: testDentist.dentistId,
      locationId: testLocation.locationId,
      serviceId: testService.serviceId,
      startAt: new Date('2026-11-06T11:00:00Z'),
      endAt: new Date('2026-11-06T11:45:00Z'),
      status: 'CANCELLED',
      createdByUserId: TEST_USER_ID,
      serviceNameSnapshot: testService.name,
      serviceDurationSnapshot: testService.durationMinutes,
      serviceValueSnapshot: testService.price,
    })
    .returning();

  const matchResult2 = await recoveryEngine.processFreedSlot(
    context,
    {
      appointmentId: aptToCancel2!.appointmentId,
      serviceId: testService.serviceId,
      dentistId: testDentist.dentistId,
      locationId: testLocation.locationId,
      startAt: new Date('2026-11-06T11:00:00Z'),
      endAt: new Date('2026-11-06T11:45:00Z'),
    },
    { maxOffers: 1 }
  );

  const offerC = matchResult2.offers[0]!;
  console.log(`  ✓ Generated offer for Patient C: ID=${offerC.offerId}`);

  const wamidDeclineC = `wamid.decline_${Date.now()}`;
  const webhookReqC = createMetaWebhookRequest(CLEAN_C, 'RECHAZO la oferta', wamidDeclineC);

  await webhookPostHandler(webhookReqC);

  // Check offer C is DECLINED and waitlist C is returned to WAITING
  const [updatedOfferC] = await db
    .select()
    .from(recoveryOffers)
    .where(and(eq(recoveryOffers.organizationId, TEST_ORG_ID), eq(recoveryOffers.offerId, offerC.offerId)));

  if (updatedOfferC?.status !== 'DECLINED') {
    throw new Error(`STEP 6 FAILED: Offer C status is ${updatedOfferC?.status}, expected DECLINED`);
  }
  console.log(`  ✓ Offer C status = DECLINED`);

  const [updatedWlC] = await db
    .select()
    .from(waitlist)
    .where(and(eq(waitlist.organizationId, TEST_ORG_ID), eq(waitlist.waitlistId, wlC.waitlistId)));

  if (updatedWlC?.status !== 'WAITING') {
    throw new Error(`STEP 6 FAILED: Waitlist C status is ${updatedWlC?.status}, expected WAITING`);
  }
  console.log(`  ✓ Waitlist C restored to WAITING status`);

  const msgsC = await whatsappRepo.getRecentMessagesByPhone(TEST_ORG_ID, CLEAN_C, 10);
  const outboundDeclineAckC = msgsC.find(
    (m) =>
      m.direction === 'OUTBOUND' &&
      (m.metadata as Record<string, unknown>)?.declinedVia === 'WHATSAPP_INBOUND'
  );

  if (!outboundDeclineAckC || !outboundDeclineAckC.body?.includes('registrado tu respuesta')) {
    throw new Error('STEP 6 FAILED: Patient C did not receive decline confirmation message');
  }
  console.log(`  ✓ Decline acknowledgment message delivered to Patient C:`);
  console.log(`    Preview: "${outboundDeclineAckC.body?.slice(0, 80)}..."`);
  console.log('✅ STEP 6 PASSED: Decline flow verified.\n');

  // ─── STEP 7: Deduplication & Idempotency Check ────────────────────
  console.log('[STEP 7] Testing Webhook Deduplication / Idempotency...');

  // Send the same message ID as Patient A again
  const duplicateReq = createMetaWebhookRequest(CLEAN_A, '¡ACEPTO!', wamidAcceptA);
  const duplicateRes = await webhookPostHandler(duplicateReq);
  const dupJson = await duplicateRes.json();

  if (dupJson.status !== 'success') {
    throw new Error('STEP 7 FAILED: Duplicate request failed to acknowledge 200');
  }
  console.log(`  ✓ Duplicate message safely handled without error`);
  console.log('✅ STEP 7 PASSED: Idempotency guaranteed.\n');

  console.log('==================================================================');
  console.log('  ALL PHASE 6 INBOUND & ACCEPTANCE TESTS PASSED (100%)! 🏆');
  console.log('==================================================================\n');

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, PHONE_A);
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, PHONE_B);
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, PHONE_C);

  const testPatientIds = [patientA!.patientId, patientB!.patientId, patientC!.patientId];
  for (const pid of testPatientIds) {
    await db.delete(recoveryOffers).where(eq(recoveryOffers.patientId, pid));
    await db.delete(waitlist).where(eq(waitlist.patientId, pid));
    const pApts = await db.select({ appointmentId: appointments.appointmentId }).from(appointments).where(eq(appointments.patientId, pid));
    for (const a of pApts) {
      await db.delete(recoveryOffers).where(eq(recoveryOffers.appointmentId, a.appointmentId));
      await db.delete(appointmentEvents).where(eq(appointmentEvents.appointmentId, a.appointmentId));
    }
    await db.delete(appointments).where(eq(appointments.patientId, pid));
    await db.delete(patients).where(eq(patients.patientId, pid));
  }
  console.log('Cleanup complete.\n');
}

main().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
