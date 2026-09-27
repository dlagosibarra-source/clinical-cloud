import type { ClinicalChatMessage } from "./ai.service";
import { db } from "../../../shared/database";
import { WhatsAppRepository } from "../../whatsapp/repositories/whatsapp.repository";

/**
 * Service to manage multi-turn chat history backed by PostgreSQL
 * (whatsapp_conversations and whatsapp_messages tables).
 */
export class ConversationMemoryService {
  private static repository = new WhatsAppRepository(db);

  /**
   * Retrieves the last N turns for the given user's WhatsApp ID from PostgreSQL.
   *
   * @param organizationId Clinic organization ID
   * @param waId Recipient's phone number or wa_id
   * @param limit Maximum number of turns (defaults to 10)
   */
  static async getHistory(
    organizationId: string,
    waId: string,
    limit = 10
  ): Promise<ClinicalChatMessage[]> {
    const cleanId = waId.replace(/\D/g, "");
    const messages = await this.repository.getRecentMessagesByPhone(
      organizationId,
      cleanId,
      limit
    );

    return messages.map((m) => ({
      role: m.direction === "INBOUND" ? "user" : "assistant",
      content: m.body || "",
    }));
  }

  /**
   * Appends a new user or assistant turn to the conversation in PostgreSQL.
   *
   * @param organizationId Clinic organization ID
   * @param waId Recipient's phone number or wa_id
   * @param role 'user' or 'assistant'
   * @param content Text content of the message
   * @param options Additional metadata, patientId, providerMessageId
   */
  static async appendTurn(
    organizationId: string,
    waId: string,
    role: "user" | "assistant",
    content: string,
    options?: {
      patientId?: string | null;
      providerMessageId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const cleanId = waId.replace(/\D/g, "");
    const trimmed = content.trim();
    if (!trimmed) return;

    // Idempotency: avoid duplicate insertion if providerMessageId is already recorded
    if (options?.providerMessageId) {
      const alreadyPersisted = await this.repository.isMessageProcessed(
        organizationId,
        options.providerMessageId
      );
      if (alreadyPersisted) {
        return;
      }
    }

    // Find or create active conversation
    const conversation = await this.repository.findOrCreateConversation(
      organizationId,
      cleanId,
      options?.patientId
    );

    // Persist message
    await this.repository.createMessage(organizationId, {
      conversationId: conversation.conversationId,
      patientId: options?.patientId ?? conversation.patientId,
      direction: role === "user" ? "INBOUND" : "OUTBOUND",
      type: "TEXT",
      body: trimmed,
      status: role === "user" ? "RECEIVED" : "SENT",
      providerMessageId: options?.providerMessageId,
      metadata: options?.metadata || {},
    });

    console.log(
      `[Conversation Memory] 💾 Turno persistido en PostgreSQL para ${cleanId} [${role}]`
    );
  }

  /**
   * Cleans up conversation and messages for the phone number (used in testing/simulations).
   */
  static async clearHistory(organizationId: string, waId: string): Promise<void> {
    await this.repository.clearHistoryByPhone(organizationId, waId);
  }
}
