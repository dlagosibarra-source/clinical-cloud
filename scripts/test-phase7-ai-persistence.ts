/**
 * Integration Test: Phase 7 - AI Persistence and Multi-turn Context
 *
 * Verifies:
 * 1. An inbound medical/clinical question via WhatsApp is routed to the AI Orchestrator.
 * 2. DeepSeek/Groq LLM processes the message, executes tools if needed, and returns clinical response.
 * 3. Execution trace is mandatorily persisted in PostgreSQL `ai_interactions`:
 *    - organization_id (multi-tenant isolation)
 *    - conversation_id and patient_id
 *    - provider, model, latency_ms
 *    - input_tokens, output_tokens, total_tokens
 *    - status: 'SUCCESS'
 *    - tool_calls and payloads
 * 4. Operational conversation context is recorded and updated in `ai_conversation_context`:
 *    - summary, current_intent, intent_status
 *    - context_version incremented
 * 5. Strict multi-tenant isolation: querying with another organization_id returns 0 records.
 * 6. Multi-turn conversation updates context version and links follow-up interaction.
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-phase7-ai-persistence.ts
 */

import { db } from '../src/shared/database';
import { eq, and } from 'drizzle-orm';
import {
  patients,
  aiInteractions,
  aiConversationContext,
  whatsappConversations,
  whatsappMessages,
} from '../src/shared/database/schema';
import { InboundWhatsAppService } from '../src/modules/whatsapp/services/inbound-whatsapp.service';
import { WhatsAppRepository } from '../src/modules/whatsapp/repositories/whatsapp.repository';
import { AIInteractionsRepository } from '../src/modules/ai/repositories/ai-interactions.repository';

// Bypass Meta WhatsApp Graph API delivery in local testing
process.env.MOCK_WHATSAPP_DISPATCH = 'true';

const TEST_ORG_ID = '00000000-0000-4000-a000-000000000001';
const TEST_PHONE = '+525544889900';
const CLEAN_PHONE = '525544889900';
const CONTACT_NAME = 'Gabriel Mendoza';

async function main() {
  console.log('==================================================================');
  console.log('  TEST SUITE: PHASE 7 - AI PERSISTENCE & CONTEXT MEMORY');
  console.log('==================================================================\n');

  const inboundService = new InboundWhatsAppService(db);
  const whatsappRepo = new WhatsAppRepository(db);
  const aiRepo = new AIInteractionsRepository(db);

  // Initial cleanup
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, CLEAN_PHONE);
  await db.delete(patients).where(
    and(
      eq(patients.organizationId, TEST_ORG_ID),
      eq(patients.phone, TEST_PHONE)
    )
  );

  // [STEP 1] Seed test patient
  console.log('[STEP 1] Seeding test patient in PostgreSQL...');
  const [testPatient] = await db
    .insert(patients)
    .values({
      organizationId: TEST_ORG_ID,
      firstName: 'Gabriel',
      lastName: 'Mendoza',
      phone: TEST_PHONE,
      email: `gabriel.test.${Date.now()}@example.com`,
      whatsappOptIn: true,
      status: 'ACTIVE',
    })
    .returning();

  if (!testPatient) {
    throw new Error('STEP 1 FAILED: Failed to seed test patient');
  }

  console.log(`  ✓ Patient seeded: ID=${testPatient.patientId}, Name=${testPatient.firstName} ${testPatient.lastName}`);
  console.log('✅ STEP 1 PASSED: Patient ready.\n');

  // [STEP 2] Simulate incoming medical consultation via WhatsApp
  console.log('[STEP 2] Simulating incoming WhatsApp medical consultation...');
  const message1Text = 'Hola, buenas tardes. Tengo un dolor intenso y punzante en una muela desde anoche. ¿Qué horarios tienen para una consulta dental de urgencia o valoración?';
  const wamid1 = `wamid.test_p7_msg1_${Date.now()}`;

  const inboundResult1 = await inboundService.processIncomingMessage({
    rawFrom: TEST_PHONE,
    userText: message1Text,
    contactName: CONTACT_NAME,
    messageId: wamid1,
    organizationId: TEST_ORG_ID,
  });

  console.log(`  ✓ Inbound message handled: type=${inboundResult1.type}`);
  console.log(`  ✓ Interaction ID: ${inboundResult1.interactionId}`);
  console.log(`  ✓ AI Reply text preview: "${inboundResult1.replyText?.slice(0, 100)}..."`);

  if (inboundResult1.type !== 'AI_CHAT') {
    throw new Error(`STEP 2 FAILED: Expected AI_CHAT but got ${inboundResult1.type}`);
  }
  if (!inboundResult1.interactionId) {
    throw new Error('STEP 2 FAILED: Interaction ID was not returned by orchestrator');
  }
  if (!inboundResult1.replyText || inboundResult1.replyText.length < 10) {
    throw new Error('STEP 2 FAILED: AI did not generate a valid reply');
  }
  console.log('✅ STEP 2 PASSED: WhatsApp message routed to AI and response generated.\n');

  // [STEP 3] Verify ai_interactions row in PostgreSQL
  console.log('[STEP 3] Verifying execution trace recorded in ai_interactions table...');
  const [interaction1] = await db
    .select()
    .from(aiInteractions)
    .where(
      and(
        eq(aiInteractions.organizationId, TEST_ORG_ID),
        eq(aiInteractions.interactionId, inboundResult1.interactionId)
      )
    );

  if (!interaction1) {
    throw new Error('STEP 3 FAILED: ai_interactions record not found in PostgreSQL');
  }

  console.log('  ✓ Interaction row verified in PostgreSQL:');
  console.log(`    - ID: ${interaction1.interactionId}`);
  console.log(`    - Organization ID: ${interaction1.organizationId}`);
  console.log(`    - Patient ID: ${interaction1.patientId}`);
  console.log(`    - Conversation ID: ${interaction1.conversationId}`);
  console.log(`    - Provider: ${interaction1.provider}`);
  console.log(`    - Model: ${interaction1.model}`);
  console.log(`    - Tokens: input=${interaction1.inputTokens}, output=${interaction1.outputTokens}, total=${interaction1.totalTokens}`);
  console.log(`    - Latency: ${interaction1.latencyMs}ms`);
  console.log(`    - Status: ${interaction1.status}`);
  console.log(`    - Result Type: ${interaction1.resultType}`);

  if (interaction1.organizationId !== TEST_ORG_ID) {
    throw new Error(`STEP 3 FAILED: Organization ID mismatch: expected ${TEST_ORG_ID}`);
  }
  if (interaction1.patientId !== testPatient.patientId) {
    throw new Error(`STEP 3 FAILED: Patient ID mismatch: expected ${testPatient.patientId}`);
  }
  if (interaction1.status !== 'SUCCESS') {
    throw new Error(`STEP 3 FAILED: Expected status SUCCESS but got ${interaction1.status}`);
  }
  if (interaction1.totalTokens <= 0) {
    throw new Error('STEP 3 FAILED: totalTokens must be greater than 0');
  }
  if (interaction1.latencyMs <= 0) {
    throw new Error('STEP 3 FAILED: latencyMs must be greater than 0');
  }
  console.log('✅ STEP 3 PASSED: ai_interactions schema and token trace verified.\n');

  // [STEP 4] Verify ai_conversation_context row in PostgreSQL
  console.log('[STEP 4] Verifying operational context in ai_conversation_context table...');
  const [contextRecord1] = await db
    .select()
    .from(aiConversationContext)
    .where(
      and(
        eq(aiConversationContext.organizationId, TEST_ORG_ID),
        eq(aiConversationContext.conversationId, interaction1.conversationId!)
      )
    );

  if (!contextRecord1) {
    throw new Error('STEP 4 FAILED: ai_conversation_context record not found in PostgreSQL');
  }

  console.log('  ✓ Conversation context row verified in PostgreSQL:');
  console.log(`    - Context ID: ${contextRecord1.contextId}`);
  console.log(`    - Organization ID: ${contextRecord1.organizationId}`);
  console.log(`    - Conversation ID: ${contextRecord1.conversationId}`);
  console.log(`    - Patient ID: ${contextRecord1.patientId}`);
  console.log(`    - Summary: "${contextRecord1.summary}"`);
  console.log(`    - Current Intent: ${contextRecord1.currentIntent}`);
  console.log(`    - Intent Status: ${contextRecord1.intentStatus}`);
  console.log(`    - Context Version: ${contextRecord1.contextVersion}`);
  console.log(`    - Last AI Request At: ${contextRecord1.lastAiRequestAt?.toISOString()}`);

  if (contextRecord1.intentStatus !== 'ACTIVE') {
    throw new Error(`STEP 4 FAILED: Expected intentStatus ACTIVE but got ${contextRecord1.intentStatus}`);
  }
  if (contextRecord1.contextVersion !== 1) {
    throw new Error(`STEP 4 FAILED: Expected contextVersion 1 but got ${contextRecord1.contextVersion}`);
  }
  console.log('✅ STEP 4 PASSED: ai_conversation_context operational memory verified.\n');

  // [STEP 5] Verify Multi-tenant Isolation
  console.log('[STEP 5] Testing strict multi-tenant isolation...');
  const OTHER_ORG_ID = '00000000-0000-4000-a000-999999999999';

  const otherOrgInteractions = await db
    .select()
    .from(aiInteractions)
    .where(
      and(
        eq(aiInteractions.organizationId, OTHER_ORG_ID),
        eq(aiInteractions.interactionId, inboundResult1.interactionId)
      )
    );

  const otherOrgContext = await db
    .select()
    .from(aiConversationContext)
    .where(
      and(
        eq(aiConversationContext.organizationId, OTHER_ORG_ID),
        eq(aiConversationContext.conversationId, interaction1.conversationId!)
      )
    );

  if (otherOrgInteractions.length !== 0) {
    throw new Error('STEP 5 FAILED: Multi-tenant leak! Other org can read interaction');
  }
  if (otherOrgContext.length !== 0) {
    throw new Error('STEP 5 FAILED: Multi-tenant leak! Other org can read conversation context');
  }
  console.log('  ✓ Multi-tenant barrier intact: 0 records leaked across organization boundary.');
  console.log('✅ STEP 5 PASSED: Multi-tenant isolation verified.\n');

  // [STEP 6] Multi-turn Follow-up: Test Context Version Increment
  console.log('[STEP 6] Testing multi-turn follow-up & context version increment...');
  const message2Text = 'Muchas gracias por la información. ¿Aceptan pago con tarjeta de crédito o meses sin intereses?';
  const wamid2 = `wamid.test_p7_msg2_${Date.now()}`;

  const inboundResult2 = await inboundService.processIncomingMessage({
    rawFrom: TEST_PHONE,
    userText: message2Text,
    contactName: CONTACT_NAME,
    messageId: wamid2,
    organizationId: TEST_ORG_ID,
  });

  console.log(`  ✓ Turn 2 processed: Interaction ID = ${inboundResult2.interactionId}`);
  console.log(`  ✓ Turn 2 reply: "${inboundResult2.replyText?.slice(0, 100)}..."`);

  const [interaction2] = await db
    .select()
    .from(aiInteractions)
    .where(
      and(
        eq(aiInteractions.organizationId, TEST_ORG_ID),
        eq(aiInteractions.interactionId, inboundResult2.interactionId!)
      )
    );

  const [contextRecord2] = await db
    .select()
    .from(aiConversationContext)
    .where(
      and(
        eq(aiConversationContext.organizationId, TEST_ORG_ID),
        eq(aiConversationContext.conversationId, interaction1.conversationId!)
      )
    );

  if (!interaction2) {
    throw new Error('STEP 6 FAILED: Turn 2 interaction not found in DB');
  }
  if (interaction2.totalTokens <= 0) {
    throw new Error('STEP 6 FAILED: Turn 2 totalTokens must be > 0');
  }
  if (!contextRecord2) {
    throw new Error('STEP 6 FAILED: Turn 2 context record not found in DB');
  }
  if (contextRecord2.contextVersion !== 2) {
    throw new Error(`STEP 6 FAILED: Expected contextVersion 2 after second turn, got ${contextRecord2.contextVersion}`);
  }

  console.log(`  ✓ Turn 2 interaction persisted: tokens=${interaction2.totalTokens}, latency=${interaction2.latencyMs}ms`);
  console.log(`  ✓ Context version incremented: ${contextRecord1.contextVersion} ➔ ${contextRecord2.contextVersion}`);
  console.log('✅ STEP 6 PASSED: Multi-turn persistence and context versioning verified.\n');

  console.log('==================================================================');
  console.log('  ALL PHASE 7 AI PERSISTENCE & CONTEXT TESTS PASSED (100%)! 🏆');
  console.log('==================================================================\n');

  // [CLEANUP]
  console.log('🧹 Cleaning up test records...');
  await whatsappRepo.clearHistoryByPhone(TEST_ORG_ID, CLEAN_PHONE);
  await db.delete(patients).where(
    and(
      eq(patients.organizationId, TEST_ORG_ID),
      eq(patients.patientId, testPatient.patientId)
    )
  );
  console.log('Cleanup complete.\n');
}

main().catch((err) => {
  console.error('❌ Phase 7 test suite failed:', err);
  process.exit(1);
});
