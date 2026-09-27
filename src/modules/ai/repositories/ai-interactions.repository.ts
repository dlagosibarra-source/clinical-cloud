import { and, eq, desc, sql } from 'drizzle-orm';
import { type Database } from '@/shared/database';
import {
  aiInteractions,
  aiConversationContext,
  type AIInteraction,
  type NewAIInteraction,
  type AIConversationContext,
  type NewAIConversationContext,
} from '../types/schema';

export class AIInteractionsRepository {
  constructor(private readonly db: Database) {}

  /**
   * Records a new AI interaction (append-only audit trace).
   */
  async recordInteraction(data: NewAIInteraction): Promise<AIInteraction> {
    const [record] = await this.db
      .insert(aiInteractions)
      .values(data)
      .returning();
    if (!record) {
      throw new Error('Failed to insert AI interaction');
    }
    return record;
  }

  /**
   * Retrieves recent interactions for a specific conversation thread.
   */
  async getInteractionsByConversation(
    organizationId: string,
    conversationId: string,
    limit = 50
  ): Promise<AIInteraction[]> {
    return this.db
      .select()
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.organizationId, organizationId),
          eq(aiInteractions.conversationId, conversationId)
        )
      )
      .orderBy(desc(aiInteractions.createdAt))
      .limit(limit);
  }

  /**
   * Retrieves recent interactions for a patient.
   */
  async getInteractionsByPatient(
    organizationId: string,
    patientId: string,
    limit = 50
  ): Promise<AIInteraction[]> {
    return this.db
      .select()
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.organizationId, organizationId),
          eq(aiInteractions.patientId, patientId)
        )
      )
      .orderBy(desc(aiInteractions.createdAt))
      .limit(limit);
  }

  /**
   * Retrieves the operational clinical context for a conversation.
   */
  async getConversationContext(
    organizationId: string,
    conversationId: string
  ): Promise<AIConversationContext | null> {
    const results = await this.db
      .select()
      .from(aiConversationContext)
      .where(
        and(
          eq(aiConversationContext.organizationId, organizationId),
          eq(aiConversationContext.conversationId, conversationId)
        )
      )
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Upserts the operational clinical context for a conversation.
   */
  async upsertConversationContext(
    data: NewAIConversationContext
  ): Promise<AIConversationContext> {
    const [context] = await this.db
      .insert(aiConversationContext)
      .values(data)
      .onConflictDoUpdate({
        target: [aiConversationContext.organizationId, aiConversationContext.conversationId],
        set: {
          summary: data.summary,
          patientId: data.patientId,
          currentIntent: data.currentIntent,
          intentStatus: data.intentStatus ?? 'NONE',
          contextData: data.contextData ?? {},
          lastProcessedMessageId: data.lastProcessedMessageId,
          lastAiRequestAt: data.lastAiRequestAt ?? new Date(),
          contextVersion: sql`${aiConversationContext.contextVersion} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!context) {
      throw new Error('Failed to upsert AI conversation context');
    }
    return context;
  }
}
