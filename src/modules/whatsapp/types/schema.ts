import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from '../../organizations/types/schema';
import { patients } from '../../patients/types/schema';

/**
 * WhatsApp Integrations table (Section 25 of MVP Engineering Spec).
 *
 * Configures the Meta WhatsApp Cloud API credentials per organization.
 * Secrets are referenced safely (PostgreSQL stores references, not raw credentials).
 *
 * Statuses: PENDING | ACTIVE | DISCONNECTED | ERROR | DISABLED
 */
export const whatsappIntegrations = pgTable('whatsapp_integrations', {
  integrationId: uuid('integration_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  provider: varchar('provider', { length: 50 }).notNull().default('META_WHATSAPP'),
  phoneNumber: varchar('phone_number', { length: 30 }),
  phoneNumberId: varchar('phone_number_id', { length: 100 }),
  businessAccountId: varchar('business_account_id', { length: 100 }),
  displayName: varchar('display_name', { length: 100 }),
  secretReference: varchar('secret_reference', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  webhookVerified: boolean('webhook_verified').notNull().default(false),
  lastWebhookAt: timestamp('last_webhook_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_whatsapp_integrations_org_phone_id').on(table.organizationId, table.phoneNumberId),
  index('idx_whatsapp_integrations_org_id').on(table.organizationId),
  index('idx_whatsapp_integrations_org_status').on(table.organizationId, table.status),
]);

/**
 * WhatsApp Conversations table (Section 22 of MVP Engineering Spec).
 *
 * Tracks communication threads between an organization and a phone/patient.
 * Multiple historical conversations may exist. Does not require an appointment.
 *
 * Statuses: OPEN | CLOSED
 */
export const whatsappConversations = pgTable('whatsapp_conversations', {
  conversationId: uuid('conversation_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  patientId: uuid('patient_id'), // Nullable for prospects or prior to patient identification
  phone: varchar('phone', { length: 30 }).notNull(), // E.164 format
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
  lastOutboundAt: timestamp('last_outbound_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Composite unique for cross-table referencing
  unique('uq_whatsapp_conversations_org_conv').on(table.organizationId, table.conversationId),
  // Composite foreign key to patients
  foreignKey({
    name: 'fk_whatsapp_conversations_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  // Performance indexes
  index('idx_whatsapp_conversations_org_id').on(table.organizationId),
  index('idx_whatsapp_conversations_org_phone').on(table.organizationId, table.phone),
  index('idx_whatsapp_conversations_org_patient').on(table.organizationId, table.patientId),
  index('idx_whatsapp_conversations_org_status').on(table.organizationId, table.status),
  index('idx_whatsapp_conversations_last_msg').on(table.organizationId, table.lastMessageAt),
]);

/**
 * WhatsApp Messages table (Section 23 of MVP Engineering Spec).
 *
 * Append-only log of inbound and outbound messages.
 * Binary media is NOT stored in PostgreSQL (stored as media references).
 * provider_message_id is idempotent.
 *
 * Directions: INBOUND | OUTBOUND
 * Types: TEXT | IMAGE | AUDIO | DOCUMENT | VIDEO | LOCATION | OTHER
 * Statuses: RECEIVED | SENT | DELIVERED | READ | FAILED
 */
export const whatsappMessages = pgTable('whatsapp_messages', {
  messageId: uuid('message_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  conversationId: uuid('conversation_id').notNull(),
  patientId: uuid('patient_id'),
  providerMessageId: varchar('provider_message_id', { length: 150 }), // Meta wamid (for deduplication/idempotency)
  direction: varchar('direction', { length: 10 }).notNull(), // INBOUND | OUTBOUND
  type: varchar('type', { length: 20 }).notNull().default('TEXT'),
  body: text('body'),
  mediaReference: text('media_reference'),
  status: varchar('status', { length: 20 }).notNull().default('SENT'),
  providerTimestamp: timestamp('provider_timestamp', { withTimezone: true }),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Composite foreign key to conversations
  foreignKey({
    name: 'fk_whatsapp_messages_org_conversation',
    columns: [table.organizationId, table.conversationId],
    foreignColumns: [whatsappConversations.organizationId, whatsappConversations.conversationId],
  }),
  // Composite foreign key to patients
  foreignKey({
    name: 'fk_whatsapp_messages_org_patient',
    columns: [table.organizationId, table.patientId],
    foreignColumns: [patients.organizationId, patients.patientId],
  }),
  // Performance and deduplication indexes
  index('idx_whatsapp_messages_org_id').on(table.organizationId),
  index('idx_whatsapp_messages_org_conversation').on(table.organizationId, table.conversationId),
  index('idx_whatsapp_messages_org_provider_msg').on(table.organizationId, table.providerMessageId),
  index('idx_whatsapp_messages_org_status').on(table.organizationId, table.status),
  index('idx_whatsapp_messages_org_created').on(table.organizationId, table.createdAt),
]);

/**
 * WhatsApp Templates table (Section 24 of MVP Engineering Spec).
 *
 * Pre-approved templates for proactive outbound messaging outside
 * the 24-hour customer service window.
 *
 * Categories: UTILITY | MARKETING | AUTHENTICATION
 * Statuses: DRAFT | PENDING | APPROVED | REJECTED | DISABLED
 */
export const whatsappTemplates = pgTable('whatsapp_templates', {
  templateId: uuid('template_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  name: varchar('name', { length: 100 }).notNull(),
  providerTemplateName: varchar('provider_template_name', { length: 100 }).notNull(),
  languageCode: varchar('language_code', { length: 10 }).notNull().default('es_MX'),
  category: varchar('category', { length: 30 }).notNull().default('UTILITY'),
  body: text('body').notNull(),
  variablesSchema: jsonb('variables_schema').default({}),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  providerTemplateId: varchar('provider_template_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_whatsapp_templates_org_name_lang').on(table.organizationId, table.name, table.languageCode),
  index('idx_whatsapp_templates_org_id').on(table.organizationId),
  index('idx_whatsapp_templates_org_status').on(table.organizationId, table.status),
]);

// Inferred TypeScript types
export type WhatsAppIntegration = typeof whatsappIntegrations.$inferSelect;
export type NewWhatsAppIntegration = typeof whatsappIntegrations.$inferInsert;

export type WhatsAppConversation = typeof whatsappConversations.$inferSelect;
export type NewWhatsAppConversation = typeof whatsappConversations.$inferInsert;

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type NewWhatsAppMessage = typeof whatsappMessages.$inferInsert;

export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type NewWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;
