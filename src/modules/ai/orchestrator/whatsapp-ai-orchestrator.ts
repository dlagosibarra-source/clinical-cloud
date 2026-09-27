import {
  generateClinicalResponse,
  getClinicCurrentDateBanner,
} from "../services/ai.service";
import { sendWhatsAppMessage } from "../services/whatsapp.service";
import { ConversationMemoryService } from "../services/conversation-memory.service";
import { AIInteractionsRepository } from "../repositories/ai-interactions.repository";
import { WhatsAppRepository } from "@/modules/whatsapp/repositories/whatsapp.repository";
import { db } from "@/shared/database";
import { getAuthenticatedContext } from "@/shared/auth/server-context";
import { PatientsRepository } from "@/modules/patients/repositories/patients.repository";

export interface HandleInboundMessageParams {
  rawFrom: string;
  userText: string;
  contactName: string;
  messageId?: string;
  organizationId?: string;
  conversationId?: string;
  inboundDbMessageId?: string;
}

export interface OrchestratorResult {
  success: boolean;
  replyText?: string;
  whatsappMessageId?: string;
  interactionId?: string;
  error?: string;
}

/**
 * Main WhatsApp AI Orchestrator with MCP Engine and Conversation Memory
 * Coordinates message ingestion, multi-turn memory retrieval, MCP tool execution,
 * AI execution persistence (ai_interactions & ai_conversation_context), and WhatsApp delivery.
 */
export async function handleInboundWhatsAppMessage({
  rawFrom,
  userText,
  contactName,
  messageId,
  organizationId,
  conversationId,
  inboundDbMessageId,
}: HandleInboundMessageParams): Promise<OrchestratorResult> {
  const cleanPhone = rawFrom.replace(/\D/g, "");
  const startTime = Date.now();

  console.log("==================================================");
  console.log(`[WhatsApp Orchestrator] 🚀 Iniciando turno para: ${cleanPhone} (${contactName})`);
  console.log(`[WhatsApp Orchestrator] 💬 Mensaje entrante: "${userText}" (ID: ${messageId ?? "N/A"})`);

  const aiRepo = new AIInteractionsRepository(db);
  const whatsappRepo = new WhatsAppRepository(db);
  let resolvedOrgId: string | null = organizationId ?? null;
  let resolvedConvId: string | null = conversationId ?? null;
  let resolvedPatientId: string | null = null;

  try {
    // 1. Resolve multi-tenant context
    if (!resolvedOrgId) {
      const context = await getAuthenticatedContext();
      resolvedOrgId = context.organization_id;
    }
    const orgId = resolvedOrgId;

    // 2. Query PostgreSQL for patient identity (New vs Recurring)
    const patientRepo = new PatientsRepository(db);
    const existingPatient = await patientRepo.findByPhone(orgId, cleanPhone);

    let patientContext = "[ESTADO: NUEVO PACIENTE]";
    let resolvedContactName = contactName;

    if (existingPatient) {
      resolvedPatientId = existingPatient.patientId;
      resolvedContactName = `${existingPatient.firstName} ${existingPatient.lastName}`.trim();
      patientContext = `[ESTADO: RECURRENTE] | [NOMBRE: ${resolvedContactName}] | [ID: ${existingPatient.patientId}]`;
      console.log(
        `[WhatsApp Orchestrator] 👤 Paciente recurrente identificado: "${resolvedContactName}" (ID: ${existingPatient.patientId})`
      );
    } else {
      console.log(
        `[WhatsApp Orchestrator] 🆕 Paciente nuevo detectado: ${cleanPhone} (WhatsApp: "${contactName}")`
      );
    }

    // 3. Ensure conversation exists in PostgreSQL
    if (!resolvedConvId) {
      const conv = await whatsappRepo.findOrCreateConversation(
        orgId,
        cleanPhone,
        resolvedPatientId
      );
      resolvedConvId = conv.conversationId;
    }

    // 4. Retrieve conversation history before this turn from PostgreSQL
    const rawHistory = await ConversationMemoryService.getHistory(
      orgId,
      cleanPhone,
      10
    );

    // Filter out duplicate user turn if inbound message was already stored in DB
    const history = rawHistory.filter((msg, idx) => {
      if (
        idx === rawHistory.length - 1 &&
        msg.role === "user" &&
        msg.content.trim() === userText.trim()
      ) {
        return false;
      }
      return true;
    });

    console.log(
      `[WhatsApp Orchestrator] 🧠 Memoria recuperada: ${history.length} turnos previos para ${cleanPhone}.`
    );

    // 5. Append current user message to PostgreSQL if not already created upstream
    if (!inboundDbMessageId) {
      await ConversationMemoryService.appendTurn(
        orgId,
        cleanPhone,
        "user",
        userText,
        {
          patientId: resolvedPatientId,
          providerMessageId: messageId,
        }
      );
    }

    // 6. Temporal Anchor for Local Timezone (America/Mazatlan)
    const currentDateBanner = getClinicCurrentDateBanner("America/Mazatlan");
    console.log(`[WhatsApp Orchestrator] 📅 Anclaje temporal: "${currentDateBanner}"`);

    // 7. Generate response using LLM + MCP Tools
    const provider = (process.env.AI_PROVIDER || "groq").toUpperCase();
    const modelName = process.env.AI_MODEL || "openai/gpt-oss-20b";

    let aiResult;
    try {
      aiResult = await generateClinicalResponse(history, userText, {
        organizationId: orgId,
        patientPhone: cleanPhone,
        contactName: resolvedContactName,
        patientContext,
        currentDateBanner,
        maxSteps: 5,
      });
    } catch (genError) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = genError instanceof Error ? genError.message : String(genError);

      console.error(`[WhatsApp Orchestrator] ❌ Error en generación LLM (${latencyMs}ms): ${errorMsg}`);

      // Persist failed interaction trace
      const failedRecord = await aiRepo.recordInteraction({
        organizationId: orgId,
        conversationId: resolvedConvId,
        patientId: resolvedPatientId,
        triggerMessageId: inboundDbMessageId ?? null,
        providerMessageId: messageId ?? null,
        provider,
        model: modelName,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs,
        status: "FAILED",
        errorMessage: errorMsg,
        requestPayload: { userMessage: userText, historyLength: history.length },
      });

      return {
        success: false,
        interactionId: failedRecord.interactionId,
        error: errorMsg,
      };
    }

    const latencyMs = Date.now() - startTime;
    let replyText = aiResult.text?.trim();

    // Defense-in-depth: If LLM executed tools but didn't generate closing text
    if (!replyText && aiResult.toolResults && aiResult.toolResults.length > 0) {
      console.warn(
        `[WhatsApp Orchestrator] ⚠️ El LLM ejecutó herramientas (${aiResult.toolResults.length}) pero no devolvió texto de cierre. Extrayendo confirmación del resultado del MCP.`
      );
      for (let i = aiResult.toolResults.length - 1; i >= 0; i--) {
        const tr = aiResult.toolResults[i] as { output?: { message?: string } };
        if (tr?.output?.message) {
          replyText = tr.output.message;
          break;
        }
      }
    }

    // Ultimate fallback if LLM produced absolutely no text
    if (!replyText) {
      console.warn(
        `[WhatsApp Orchestrator] ⚠️ El modelo no devolvió texto de respuesta para ${cleanPhone}. Generando mensaje de cortesía seguro.`
      );
      replyText = "¡Listo! He procesado tu solicitud en nuestro sistema. ¿Hay algo más en lo que pueda apoyarte hoy?";
    }

    console.log(
      `[WhatsApp Orchestrator] 💬 Respuesta final (${replyText.length} chars, latencia: ${latencyMs}ms):\n"${replyText}"`
    );

    // 8. OBLIGATORY PERSISTENCE: Save trace into ai_interactions
    const usage = aiResult.totalUsage ?? aiResult.usage;
    const promptTokens = usage?.inputTokens ?? 0;
    const completionTokens = usage?.outputTokens ?? 0;
    const totalTokens = usage?.totalTokens ?? (promptTokens + completionTokens);

    const toolNames = aiResult.toolCalls?.map((t: any) => t.toolName).join(", ") || null;
    const primaryTool = aiResult.toolCalls?.[0]?.toolName;

    const recordedInteraction = await aiRepo.recordInteraction({
      organizationId: orgId,
      conversationId: resolvedConvId,
      patientId: resolvedPatientId,
      triggerMessageId: inboundDbMessageId ?? null,
      providerMessageId: messageId ?? null,
      provider,
      model: modelName,
      toolName: toolNames,
      toolCalls: aiResult.toolCalls ?? [],
      toolResults: aiResult.toolResults ?? [],
      requestPayload: { userMessage: userText, historyLength: history.length },
      responsePayload: { text: replyText, finishReason: aiResult.finishReason },
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      totalTokens,
      latencyMs,
      status: "SUCCESS",
      resultType: aiResult.toolCalls?.length ? "TOOL_CALL" : "DIRECT_TEXT",
      metadata: {
        contactName: resolvedContactName,
        phone: cleanPhone,
        stepCount: aiResult.steps?.length ?? 1,
      },
    });

    console.log(
      `[WhatsApp Orchestrator] 💾 Traza de IA persistida en PostgreSQL: ID=${recordedInteraction.interactionId} (Tokens: in=${promptTokens}, out=${completionTokens}, total=${totalTokens}, latencia=${latencyMs}ms)`
    );

    // 9. Update ai_conversation_context with long-term clinical summary
    if (resolvedConvId) {
      await aiRepo.upsertConversationContext({
        organizationId: orgId,
        conversationId: resolvedConvId,
        patientId: resolvedPatientId,
        summary: `Consulta de paciente: "${userText.slice(0, 150)}"`,
        currentIntent: primaryTool ?? "CLINICAL_INQUIRY",
        intentStatus: "ACTIVE",
        contextData: {
          lastToolCalled: primaryTool ?? null,
          lastResponsePreview: replyText.slice(0, 150),
          totalTokensUsed: totalTokens,
        },
        lastProcessedMessageId: inboundDbMessageId ?? null,
        lastAiRequestAt: new Date(),
      });
      console.log(
        `[WhatsApp Orchestrator] 🧠 Contexto conversacional actualizado en PostgreSQL (Conv: ${resolvedConvId})`
      );
    }

    // 10. Dispatch message via WhatsApp Cloud API (Graph API v21.0)
    const sendResult = await sendWhatsAppMessage(cleanPhone, replyText);

    // 11. Save assistant reply into PostgreSQL
    await ConversationMemoryService.appendTurn(
      orgId,
      cleanPhone,
      "assistant",
      replyText,
      {
        patientId: resolvedPatientId,
        providerMessageId: sendResult.messageId,
      }
    );

    if (sendResult.success) {
      console.log(
        `[WhatsApp Orchestrator] ✨ Turno completado exitosamente para ${cleanPhone}. WhatsApp ID: ${sendResult.messageId}`
      );
      console.log("==================================================");
      return {
        success: true,
        replyText,
        whatsappMessageId: sendResult.messageId,
        interactionId: recordedInteraction.interactionId,
      };
    } else {
      console.error(
        `[WhatsApp Orchestrator] ❌ Error enviando WhatsApp a ${cleanPhone}: ${sendResult.error}`
      );
      console.log("==================================================");
      return {
        success: false,
        replyText,
        interactionId: recordedInteraction.interactionId,
        error: sendResult.error,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const latencyMs = Date.now() - startTime;
    console.error(
      `[WhatsApp Orchestrator] ❌ Excepción inesperada en orquestador para ${cleanPhone}:`,
      error
    );

    if (resolvedOrgId) {
      try {
        await aiRepo.recordInteraction({
          organizationId: resolvedOrgId,
          conversationId: resolvedConvId,
          patientId: resolvedPatientId,
          triggerMessageId: inboundDbMessageId ?? null,
          providerMessageId: messageId ?? null,
          provider: (process.env.AI_PROVIDER || "groq").toUpperCase(),
          model: process.env.AI_MODEL || "openai/gpt-oss-20b",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          latencyMs,
          status: "FAILED",
          errorMessage: errorMsg,
          requestPayload: { userMessage: userText },
        });
      } catch (persistErr) {
        console.error("[WhatsApp Orchestrator] ❌ Error persistiendo fallo de interacción:", persistErr);
      }
    }

    console.log("==================================================");
    return {
      success: false,
      error: errorMsg,
    };
  }
}
