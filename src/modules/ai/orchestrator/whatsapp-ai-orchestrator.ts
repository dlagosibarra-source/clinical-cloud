import {
  generateClinicalResponse,
  getClinicCurrentDateBanner,
} from "../services/ai.service";
import { sendWhatsAppMessage } from "../services/whatsapp.service";
import { ConversationMemoryService } from "../services/conversation-memory.service";
import { db } from "@/shared/database";
import { getAuthenticatedContext } from "@/shared/auth/context";
import { PatientsRepository } from "@/modules/patients/repositories/patients.repository";

export interface HandleInboundMessageParams {
  rawFrom: string;
  userText: string;
  contactName: string;
  messageId?: string;
}

export interface OrchestratorResult {
  success: boolean;
  replyText?: string;
  whatsappMessageId?: string;
  error?: string;
}

/**
 * Main WhatsApp AI Orchestrator with MCP Engine and Conversation Memory
 * Coordinates message ingestion, multi-turn memory retrieval, MCP tool execution, and WhatsApp delivery.
 */
export async function handleInboundWhatsAppMessage({
  rawFrom,
  userText,
  contactName,
  messageId,
}: HandleInboundMessageParams): Promise<OrchestratorResult> {
  const cleanPhone = rawFrom.replace(/\D/g, "");

  console.log("==================================================");
  console.log(`[WhatsApp Orchestrator] 🚀 Iniciando turno para: ${cleanPhone} (${contactName})`);
  console.log(`[WhatsApp Orchestrator] 💬 Mensaje entrante: "${userText}" (ID: ${messageId ?? "N/A"})`);

  try {
    // 1. Retrieve conversation history before this turn
    const history = ConversationMemoryService.getHistory(cleanPhone, 10);
    console.log(
      `[WhatsApp Orchestrator] 🧠 Memoria recuperada: ${history.length} turnos previos para ${cleanPhone}.`
    );

    // 2. Append current user message to memory
    ConversationMemoryService.appendTurn(cleanPhone, "user", userText);

    // 3. Query PostgreSQL for patient identity (New vs Recurring)
    const context = getAuthenticatedContext();
    const patientRepo = new PatientsRepository(db);
    const existingPatient = await patientRepo.findByPhone(
      context.organization_id,
      cleanPhone
    );

    let patientContext = "[ESTADO: NUEVO PACIENTE]";
    let resolvedContactName = contactName;

    if (existingPatient) {
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

    // 4. Temporal Anchor for Local Timezone (America/Mazatlan)
    const currentDateBanner = getClinicCurrentDateBanner("America/Mazatlan");
    console.log(`[WhatsApp Orchestrator] 📅 Anclaje temporal: "${currentDateBanner}"`);

    // 5. Generate response using LLM + MCP Tools
    const aiResult = await generateClinicalResponse(history, userText, {
      patientPhone: cleanPhone,
      contactName: resolvedContactName,
      patientContext,
      currentDateBanner,
      maxSteps: 5,
    });

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
      `[WhatsApp Orchestrator] 💬 Respuesta final (${replyText.length} chars):\n"${replyText}"`
    );

    // 4. Save assistant reply into conversation memory
    ConversationMemoryService.appendTurn(cleanPhone, "assistant", replyText);

    // 5. Dispatch message via WhatsApp Cloud API (Graph API v21.0)
    const sendResult = await sendWhatsAppMessage(cleanPhone, replyText);

    if (sendResult.success) {
      console.log(
        `[WhatsApp Orchestrator] ✨ Turno completado exitosamente para ${cleanPhone}. WhatsApp ID: ${sendResult.messageId}`
      );
      console.log("==================================================");
      return {
        success: true,
        replyText,
        whatsappMessageId: sendResult.messageId,
      };
    } else {
      console.error(
        `[WhatsApp Orchestrator] ❌ Error enviando WhatsApp a ${cleanPhone}: ${sendResult.error}`
      );
      console.log("==================================================");
      return {
        success: false,
        replyText,
        error: sendResult.error,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[WhatsApp Orchestrator] ❌ Excepción inesperada en orquestador para ${cleanPhone}:`,
      error
    );
    console.log("==================================================");
    return {
      success: false,
      error: errorMsg,
    };
  }
}
