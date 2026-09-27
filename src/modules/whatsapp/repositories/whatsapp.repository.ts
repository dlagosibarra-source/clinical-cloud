import { and, eq, desc } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import {
  whatsappConversations,
  whatsappMessages,
  whatsappIntegrations,
  whatsappTemplates,
  type WhatsAppConversation,
  type NewWhatsAppConversation,
  type WhatsAppMessage,
  type NewWhatsAppMessage,
  type WhatsAppIntegration,
  type WhatsAppTemplate,
} from '../types/schema';
import { aiInteractions, aiConversationContext } from '../../ai/types/schema';

export class WhatsAppRepository {
  constructor(private readonly db: Database) {}

  /**
   * Find an active or existing conversation for an organization and phone.
   */
  async findConversationByPhone(
    organizationId: string,
    phone: string
  ): Promise<WhatsAppConversation | null> {
    const cleanPhone = phone.replace(/\D/g, '');
    const results = await this.db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.organizationId, organizationId),
          eq(whatsappConversations.phone, cleanPhone)
        )
      )
      .orderBy(desc(whatsappConversations.lastMessageAt), desc(whatsappConversations.createdAt))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Find or create a conversation for a phone number.
   * If patientId is provided, binds the patientId to the conversation.
   */
  async findOrCreateConversation(
    organizationId: string,
    phone: string,
    patientId?: string | null
  ): Promise<WhatsAppConversation> {
    const cleanPhone = phone.replace(/\D/g, '');
    const existing = await this.findConversationByPhone(organizationId, cleanPhone);

    if (existing) {
      if (patientId && !existing.patientId) {
        const updated = await this.db
          .update(whatsappConversations)
          .set({ patientId, updatedAt: new Date() })
          .where(
            and(
              eq(whatsappConversations.organizationId, organizationId),
              eq(whatsappConversations.conversationId, existing.conversationId)
            )
          )
          .returning();
        return updated[0] ?? existing;
      }
      return existing;
    }

    const now = new Date();
    const inserted = await this.db
      .insert(whatsappConversations)
      .values({
        organizationId,
        patientId: patientId ?? null,
        phone: cleanPhone,
        status: 'OPEN',
        lastMessageAt: now,
      })
      .returning();

    return inserted[0]!;
  }

  /**
   * Find conversation by ID.
   */
  async findConversationById(
    organizationId: string,
    conversationId: string
  ): Promise<WhatsAppConversation | null> {
    const results = await this.db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.organizationId, organizationId),
          eq(whatsappConversations.conversationId, conversationId)
        )
      )
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Create an inbound or outbound message and update conversation timestamps.
   */
  async createMessage(
    organizationId: string,
    data: Omit<NewWhatsAppMessage, 'organizationId'>
  ): Promise<WhatsAppMessage> {
    const now = new Date();
    const inserted = await this.db
      .insert(whatsappMessages)
      .values({
        ...data,
        organizationId,
      })
      .returning();

    const created = inserted[0]!;

    const updateSet: Partial<NewWhatsAppConversation> = {
      lastMessageAt: now,
      updatedAt: now,
    };
    if (data.direction === 'INBOUND') {
      updateSet.lastInboundAt = now;
    } else if (data.direction === 'OUTBOUND') {
      updateSet.lastOutboundAt = now;
    }

    await this.db
      .update(whatsappConversations)
      .set(updateSet)
      .where(
        and(
          eq(whatsappConversations.organizationId, organizationId),
          eq(whatsappConversations.conversationId, data.conversationId)
        )
      );

    return created;
  }

  /**
   * Deduplication check by provider_message_id (wamid).
   */
  async isMessageProcessed(
    organizationId: string,
    providerMessageId: string
  ): Promise<boolean> {
    if (!providerMessageId) return false;
    const existing = await this.db
      .select({ messageId: whatsappMessages.messageId })
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.organizationId, organizationId),
          eq(whatsappMessages.providerMessageId, providerMessageId)
        )
      )
      .limit(1);

    return existing.length > 0;
  }

  /**
   * Retrieve recent messages for a conversation in chronological order.
   */
  async getRecentMessages(
    organizationId: string,
    conversationId: string,
    limit = 10
  ): Promise<WhatsAppMessage[]> {
    const messages = await this.db
      .select()
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.organizationId, organizationId),
          eq(whatsappMessages.conversationId, conversationId)
        )
      )
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(limit);

    return messages.reverse();
  }

  /**
   * Retrieve recent messages by phone number.
   */
  async getRecentMessagesByPhone(
    organizationId: string,
    phone: string,
    limit = 10
  ): Promise<WhatsAppMessage[]> {
    const conv = await this.findConversationByPhone(organizationId, phone);
    if (!conv) return [];
    return this.getRecentMessages(organizationId, conv.conversationId, limit);
  }

  /**
   * Update message status (e.g. SENT, DELIVERED, READ, FAILED).
   */
  async updateMessageStatus(
    organizationId: string,
    messageId: string,
    status: string,
    options?: {
      providerMessageId?: string;
      errorCode?: string;
      errorMessage?: string;
      providerTimestamp?: Date;
    }
  ): Promise<WhatsAppMessage | null> {
    const updated = await this.db
      .update(whatsappMessages)
      .set({
        status,
        ...(options?.providerMessageId ? { providerMessageId: options.providerMessageId } : {}),
        ...(options?.errorCode ? { errorCode: options.errorCode } : {}),
        ...(options?.errorMessage ? { errorMessage: options.errorMessage } : {}),
        ...(options?.providerTimestamp ? { providerTimestamp: options.providerTimestamp } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappMessages.organizationId, organizationId),
          eq(whatsappMessages.messageId, messageId)
        )
      )
      .returning();

    return updated[0] ?? null;
  }

  /**
   * Clean up messages and conversation for tests/simulations.
   */
  async clearHistoryByPhone(organizationId: string, phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    const convs = await this.db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.organizationId, organizationId),
          eq(whatsappConversations.phone, cleanPhone)
        )
      );

    for (const c of convs) {
      await this.db
        .delete(aiInteractions)
        .where(
          and(
            eq(aiInteractions.organizationId, organizationId),
            eq(aiInteractions.conversationId, c.conversationId)
          )
        );
      await this.db
        .delete(aiConversationContext)
        .where(
          and(
            eq(aiConversationContext.organizationId, organizationId),
            eq(aiConversationContext.conversationId, c.conversationId)
          )
        );
      await this.db
        .delete(whatsappMessages)
        .where(
          and(
            eq(whatsappMessages.organizationId, organizationId),
            eq(whatsappMessages.conversationId, c.conversationId)
          )
        );
      await this.db
        .delete(whatsappConversations)
        .where(
          and(
            eq(whatsappConversations.organizationId, organizationId),
            eq(whatsappConversations.conversationId, c.conversationId)
          )
        );
    }
  }

  /**
   * Get active integration for organization.
   */
  async getActiveIntegration(organizationId: string): Promise<WhatsAppIntegration | null> {
    const results = await this.db
      .select()
      .from(whatsappIntegrations)
      .where(
        and(
          eq(whatsappIntegrations.organizationId, organizationId),
          eq(whatsappIntegrations.status, 'ACTIVE')
        )
      )
      .limit(1);

    return results[0] ?? null;
  }
}
