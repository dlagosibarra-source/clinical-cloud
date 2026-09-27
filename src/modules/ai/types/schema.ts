import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';
import { patients } from '../../patients/types/schema';
import { whatsappConversations } from '../../whatsapp/types/schema';

/**
 * AI Interactions table (Section 31 of MVP Engineering Spec).
 *
 * Append-only trace log for every AI execution:
 * Tracks prompt, tool calls, model provider, input/output tokens, latency, and status.
 * Ensures auditability and multi-tenant isolation.
 *
 * Statuses: PENDING | SUCCESS | FAILED | TIMEOUT | CANCELLED
 */
export const aiInteractions = pgTable('ai_interactions', {
  interactionId: uuid('interaction_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  conversationId: uuid('conversation_id'),
  patientId: uuid('patient_id'),
  triggerMessageId: uuid('trigger_message_id'),
  providerMessageId: varchar('provider_message_id', { length: 150 }),
  provider: varchar('provider', { length: 50 }).notNull().default('GROQ'),
  model: varchar('model', { length: 100 }).notNull(),
  promptId: varchar('prompt_id', { length: 100 }),
  toolName: varchar('tool_name', { length: 100 }),
  toolCalls: jsonb('tool_calls').default([]),
  toolResults: jsonb('tool_results').default([]),
  requestPayload: jsonb('request_payload').default({}),
  responsePayload: jsonb('response_payload').default({}),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('SUCCESS'),
  errorMessage: text('error_message'),
  resultType: varchar('result_type', { length: 100 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_ai_interactions_org_interaction').on(table.organizationId, table.interactionId),
  foreignKey({
    name: 'fk_ai_interactions_org_conv',
    columns: [table.organizationId, table.conversationId],
    foreignColumns: [whatsappConversations.organizationId, whatsappConversations.conversationId],
  }),
  foreignKey({
    name: 'fk_ai_interactions_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  index('idx_ai_interactions_org_id').on(table.organizationId),
  index('idx_ai_interactions_org_conv').on(table.organizationId, table.conversationId),
  index('idx_ai_interactions_org_patient').on(table.organizationId, table.patientId),
  index('idx_ai_interactions_org_status').on(table.organizationId, table.status),
  index('idx_ai_interactions_org_created').on(table.organizationId, table.createdAt),
  index('idx_ai_interactions_provider').on(table.organizationId, table.provider),
]);

/**
 * AI Conversation Context table (Section 30 of MVP Engineering Spec).
 *
 * Stores mutable operational clinical context and summary per conversation thread.
 * Single active context per conversation.
 *
 * Intent statuses: NONE | ACTIVE | WAITING_FOR_USER | COMPLETED | CANCELLED | ESCALATED
 */
export const aiConversationContext = pgTable('ai_conversation_context', {
  contextId: uuid('context_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  conversationId: uuid('conversation_id').notNull(),
  patientId: uuid('patient_id'),
  summary: text('summary'),
  currentIntent: varchar('current_intent', { length: 100 }),
  intentStatus: varchar('intent_status', { length: 50 }).notNull().default('NONE'),
  contextData: jsonb('context_data').default({}),
  lastProcessedMessageId: uuid('last_processed_message_id'),
  lastAiRequestAt: timestamp('last_ai_request_at', { withTimezone: true }),
  contextVersion: integer('context_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_ai_conversation_context_org_conv').on(table.organizationId, table.conversationId),
  foreignKey({
    name: 'fk_ai_conversation_context_org_conv',
    columns: [table.organizationId, table.conversationId],
    foreignColumns: [whatsappConversations.organizationId, whatsappConversations.conversationId],
  }),
  foreignKey({
    name: 'fk_ai_conversation_context_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  index('idx_ai_conv_context_org_id').on(table.organizationId),
  index('idx_ai_conv_context_org_conv').on(table.organizationId, table.conversationId),
  index('idx_ai_conv_context_org_patient').on(table.organizationId, table.patientId),
  index('idx_ai_conv_context_org_intent').on(table.organizationId, table.intentStatus),
]);

export type AIInteraction = typeof aiInteractions.$inferSelect;
export type NewAIInteraction = typeof aiInteractions.$inferInsert;
export type AIConversationContext = typeof aiConversationContext.$inferSelect;
export type NewAIConversationContext = typeof aiConversationContext.$inferInsert;
