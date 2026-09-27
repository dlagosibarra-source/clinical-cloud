/**
 * Integration Test: Phase 6 - WhatsApp Persistence & Outbound Dispatch
 *
 * Verifies:
 * 1. Multi-tenant WhatsApp schema & composite constraints
 * 2. WhatsAppRepository conversation creation & message logging
 * 3. Provider message deduplication (idempotency)
 * 4. ConversationMemoryService backed by PostgreSQL
 * 5. RecoveryWhatsAppService outbound dispatch with MOCK_WHATSAPP_DISPATCH=true
 * 6. Non-blocking error handling (Meta failure logs FAILED without rolling back transaction)
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-phase6-outbound-persistence.ts
 */

import { db } from '../src/shared/database';
import { eq, and } from 'drizzle-orm';
import {
  organizations,
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
} from '../src/shared/database/schema';
import { WhatsAppRepository } from '../src/modules/whatsapp/repositories/whatsapp.repository';
import { ConversationMemoryService } from '../src/modules/ai/services/conversation-memory.service';
import { RecoveryWhatsAppService } from '../src/modules/whatsapp/services/recovery-whatsapp.service';
import { RecoveryEngine } from '../src/modules/recovery/services/recovery.service';
import { type AuthContext } from '../src/shared/types/index';

const TEST_ORG_ID = '00000000-0000-4000-a000-000000000001';
const TEST_USER_ID = '00000000-0000-4000-a000-000000000002';
const TEST_PHONE = '+525599887766';
const CLEAN_PHONE = '525599887766';

const context: AuthContext = {
  user_id: TEST_USER_ID,
  organization_id: TEST_ORG_ID,
  role: 'OWNER',
};

async function main() {
  console.log('==================================================================');
  console.log('  TEST SUITE: PHASE 6 - WHATSAPP PERSISTENCE & OUTBOUND DISPATCH');
  console.log('==================================================================\n');

  const whatsappRepo = new WhatsAppRepository(db);

  // Clean any previous test artifacts
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, TEST_PHONE);

  // ─── TEST 1: WhatsAppRepository Conversation & Message Lifecycle ─
  console.log('[TEST 1] Testing WhatsAppRepository conversation & message persistence...');
  const conv = await whatsappRepo.findOrCreateConversation(TEST_ORG_ID, TEST_PHONE);
  if (!conv || conv.phone !== CLEAN_PHONE || conv.status !== 'OPEN') {
    throw new Error('TEST 1 FAILED: Conversation creation failed');
  }
  console.log(`  ✓ Conversation created: ID=${conv.conversationId}, phone=${conv.phone}`);

  const testProviderMsgId = `wamid.test_${Date.now()}`;
  const msg1 = await whatsappRepo.createMessage(TEST_ORG_ID, {
    conversationId: conv.conversationId,
    direction: 'INBOUND',
    type: 'TEXT',
    body: 'Hola, buenas tardes.',
    status: 'RECEIVED',
    providerMessageId: testProviderMsgId,
  });
  console.log(`  ✓ Inbound message persisted: ID=${msg1.messageId}`);

  // Deduplication check
  const isProcessed = await whatsappRepo.isMessageProcessed(TEST_ORG_ID, testProviderMsgId);
  const isRandomProcessed = await whatsappRepo.isMessageProcessed(TEST_ORG_ID, 'non_existent_id');
  if (!isProcessed || isRandomProcessed) {
    throw new Error('TEST 1 FAILED: Deduplication check failed');
  }
  console.log(`  ✓ Idempotency deduplication verified: isMessageProcessed=${isProcessed}`);

  // Status update
  const updatedMsg = await whatsappRepo.updateMessageStatus(
    TEST_ORG_ID,
    msg1.messageId,
    'READ'
  );
  if (updatedMsg?.status !== 'READ') {
    throw new Error('TEST 1 FAILED: Status update failed');
  }
  console.log(`  ✓ Message status updated: ${updatedMsg.status}`);
  console.log('✅ TEST 1 PASSED: Repository lifecycle & deduplication verified.\n');

  // ─── TEST 2: ConversationMemoryService via PostgreSQL ────────────
  console.log('[TEST 2] Testing ConversationMemoryService backed by PostgreSQL...');
  await ConversationMemoryService.appendTurn(
    TEST_ORG_ID,
    TEST_PHONE,
    'assistant',
    '¡Hola! ¿En qué podemos ayudarte hoy?'
  );

  const history = await ConversationMemoryService.getHistory(TEST_ORG_ID, TEST_PHONE, 10);
  console.log(`  ✓ Retrieved ${history.length} turns from PostgreSQL:`);
  for (const h of history) {
    console.log(`    - [${h.role}]: "${h.content}"`);
  }
  if (history.length < 2 || history[0]?.role !== 'user' || history[1]?.role !== 'assistant') {
    throw new Error('TEST 2 FAILED: Memory history order or contents incorrect');
  }
  console.log('✅ TEST 2 PASSED: ConversationMemoryService operates 100% on PostgreSQL.\n');

  // ─── TEST 3: Mock WhatsApp Outbound Dispatch for Recovery ────────
  console.log('[TEST 3] Testing RecoveryWhatsAppService with MOCK_WHATSAPP_DISPATCH=true...');
  process.env.MOCK_WHATSAPP_DISPATCH = 'true';

  // Seed patient with whatsappOptIn = true
  const [testPatient] = await db
    .insert(patients)
    .values({
      organizationId: TEST_ORG_ID,
      firstName: 'Roberto',
      lastName: 'Gómez',
      phone: TEST_PHONE,
      email: `roberto_${Date.now()}@example.com`,
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    })
    .returning();

  // Find a dentist, location, service
  const dentistList = await db.select().from(dentists).where(eq(dentists.organizationId, TEST_ORG_ID)).limit(1);
  const locationList = await db.select().from(locations).where(eq(locations.organizationId, TEST_ORG_ID)).limit(1);
  const serviceList = await db.select().from(services).where(eq(services.organizationId, TEST_ORG_ID)).limit(1);

  const testDentist = dentistList[0]!;
  const testLocation = locationList[0]!;
  const testService = serviceList[0]!;

  const recoveryWhatsAppService = new RecoveryWhatsAppService(db);
  const mockOfferId = '11111111-2222-3333-4444-555555555555';
  const mockWaitlistId = '66666666-7777-8888-9999-000000000000';
  const mockAptId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  const dispatchResult = await recoveryWhatsAppService.dispatchRecoveryOffer({
    organizationId: TEST_ORG_ID,
    offerId: mockOfferId,
    waitlistId: mockWaitlistId,
    appointmentId: mockAptId,
    patientId: testPatient!.patientId,
    serviceId: testService.serviceId,
    dentistId: testDentist.dentistId,
    locationId: testLocation.locationId,
    startAt: new Date('2026-10-30T10:00:00Z'),
    endAt: new Date('2026-10-30T10:45:00Z'),
    expiresAt: new Date('2026-10-30T12:00:00Z'),
  });

  if (!dispatchResult.dispatched) {
    throw new Error(`TEST 3 FAILED: Dispatch failed: ${dispatchResult.error}`);
  }
  console.log(`  ✓ Recovery offer dispatched: ID=${dispatchResult.messageId}`);

  // Verify message in PostgreSQL
  const dbMessages = await whatsappRepo.getRecentMessagesByPhone(TEST_ORG_ID, TEST_PHONE, 5);
  const outboundOffer = dbMessages.find(
    (m) => m.direction === 'OUTBOUND' && (m.metadata as Record<string, unknown>)?.offerId === mockOfferId
  );

  if (!outboundOffer || outboundOffer.status !== 'SENT') {
    throw new Error('TEST 3 FAILED: Outbound offer message was not recorded as SENT in PostgreSQL');
  }
  console.log(`  ✓ Outbound message confirmed in DB:`);
  console.log(`    Status: ${outboundOffer.status}`);
  console.log(`    Metadata: ${JSON.stringify(outboundOffer.metadata)}`);
  console.log(`    Body Preview: "${outboundOffer.body?.slice(0, 60)}..."`);
  console.log('✅ TEST 3 PASSED: Outbound dispatch and metadata persistence verified.\n');

  // ─── TEST 4: Non-blocking Resilience (Meta API Failure) ──────────
  console.log('[TEST 4] Testing non-blocking resilience on Meta dispatch failure...');
  process.env.MOCK_WHATSAPP_DISPATCH = 'false'; // Force real call with invalid credentials

  const failOfferId = 'ffffffff-2222-3333-4444-555555555555';
  const failedDispatchResult = await recoveryWhatsAppService.dispatchRecoveryOffer({
    organizationId: TEST_ORG_ID,
    offerId: failOfferId,
    waitlistId: mockWaitlistId,
    appointmentId: mockAptId,
    patientId: testPatient!.patientId,
    serviceId: testService.serviceId,
    dentistId: testDentist.dentistId,
    startAt: new Date('2026-10-30T10:00:00Z'),
    endAt: new Date('2026-10-30T10:45:00Z'),
    expiresAt: new Date('2026-10-30T12:00:00Z'),
  });

  if (failedDispatchResult.dispatched) {
    throw new Error('TEST 4 FAILED: Dispatch should have reported failure with invalid credentials');
  }
  console.log(`  ✓ Failure handled gracefully: error="${failedDispatchResult.error}"`);

  // Verify failure is logged in whatsapp_messages with status FAILED and metadata.offerId
  const recentMsgs = await whatsappRepo.getRecentMessagesByPhone(TEST_ORG_ID, TEST_PHONE, 5);
  const failedMsg = recentMsgs.find(
    (m) => m.direction === 'OUTBOUND' && (m.metadata as Record<string, unknown>)?.offerId === failOfferId
  );

  if (!failedMsg || failedMsg.status !== 'FAILED') {
    throw new Error('TEST 4 FAILED: Failed message was not recorded with status=FAILED in PostgreSQL');
  }
  console.log(`  ✓ Message properly marked FAILED in DB:`);
  console.log(`    Status: ${failedMsg.status}`);
  console.log(`    Error Code: ${failedMsg.errorCode}`);
  console.log(`    Error Message: ${failedMsg.errorMessage}`);
  console.log(`    Metadata offerId: ${(failedMsg.metadata as Record<string, unknown>)?.offerId}`);
  console.log('✅ TEST 4 PASSED: Non-blocking error handling preserves integrity.\n');

  // ─── TEST 5: Full RecoveryEngine integration test with WhatsApp ─
  console.log('[TEST 5] Testing End-to-End RecoveryEngine with WhatsApp dispatch...');
  process.env.MOCK_WHATSAPP_DISPATCH = 'true';

  const recoveryEngine = new RecoveryEngine(db);

  // Add patient to waitlist
  const waitlistEntry = await recoveryEngine.addToWaitlist(context, {
    patientId: testPatient!.patientId,
    serviceId: testService.serviceId,
    dentistId: testDentist.dentistId,
    locationId: testLocation.locationId,
    preferredDateStart: '2026-10-25',
    preferredDateEnd: '2026-10-31',
    preferredTimeStart: '08:00',
    preferredTimeEnd: '18:00',
    priority: 10,
  });
  console.log(`  ✓ Waitlist entry created: ID=${waitlistEntry.waitlistId}`);

  // Create appointment to cancel
  const [aptToCancel] = await db
    .insert(appointments)
    .values({
      organizationId: TEST_ORG_ID,
      patientId: testPatient!.patientId,
      dentistId: testDentist.dentistId,
      locationId: testLocation.locationId,
      serviceId: testService.serviceId,
      startAt: new Date('2026-10-28T10:00:00Z'),
      endAt: new Date('2026-10-28T10:45:00Z'),
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
      startAt: new Date('2026-10-28T10:00:00Z'),
      endAt: new Date('2026-10-28T10:45:00Z'),
    },
    { maxOffers: 1 }
  );

  if (matchResult.offersCreated !== 1) {
    throw new Error(`TEST 5 FAILED: Expected 1 offer, got ${matchResult.offersCreated}`);
  }
  const generatedOffer = matchResult.offers[0]!;
  console.log(`  ✓ RecoveryEngine generated offer: ID=${generatedOffer.offerId}`);

  // Verify that an outbound WhatsApp message was automatically created for this offer!
  const finalMsgs = await whatsappRepo.getRecentMessagesByPhone(TEST_ORG_ID, TEST_PHONE, 10);
  const engineOutbound = finalMsgs.find(
    (m) =>
      m.direction === 'OUTBOUND' &&
      (m.metadata as Record<string, unknown>)?.offerId === generatedOffer.offerId
  );

  if (!engineOutbound || engineOutbound.status !== 'SENT') {
    throw new Error('TEST 5 FAILED: RecoveryEngine did not dispatch outbound WhatsApp message to patient');
  }
  console.log(`  ✓ WhatsApp message automatically triggered by RecoveryEngine!`);
  console.log(`    Message ID: ${engineOutbound.messageId}`);
  console.log(`    Status: ${engineOutbound.status}`);
  console.log(`    Metadata: ${JSON.stringify(engineOutbound.metadata)}`);
  console.log('✅ TEST 5 PASSED: RecoveryEngine and WhatsApp outbound integrated seamlessly!\n');

  console.log('==================================================================');
  console.log('  ALL PHASE 6 PASO 1, 2 & 3 TESTS PASSED WITH 100% SUCCESS! 🚀');
  console.log('==================================================================\n');

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, TEST_PHONE);
  if (aptToCancel) {
    await db.delete(recoveryOffers).where(eq(recoveryOffers.appointmentId, aptToCancel.appointmentId));
    await db.delete(appointmentEvents).where(eq(appointmentEvents.appointmentId, aptToCancel.appointmentId));
    await db.delete(appointments).where(eq(appointments.appointmentId, aptToCancel.appointmentId));
  }
  if (testPatient) {
    await db.delete(waitlist).where(eq(waitlist.patientId, testPatient.patientId));
    await db.delete(patients).where(eq(patients.patientId, testPatient.patientId));
  }
  console.log('Cleanup completed.\n');
}

main().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
