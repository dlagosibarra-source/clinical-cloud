import { NextRequest, NextResponse } from "next/server";
import { handleInboundWhatsAppMessage } from "../../../../modules/ai/orchestrator/whatsapp-ai-orchestrator";
import {
  sendWhatsAppMessage,
  getWhatsAppMediaInfo,
  downloadWhatsAppMediaBuffer,
} from "../../../../modules/ai/services/whatsapp.service";
import { transcribeAudioVoiceNote } from "../../../../modules/ai/services/audio-transcription.service";

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: {
            name?: string;
          };
          wa_id?: string;
        }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
          audio?: {
            id?: string;
            mime_type?: string;
          };
          voice?: {
            id?: string;
            mime_type?: string;
          };
          image?: {
            id?: string;
            caption?: string;
          };
          document?: {
            id?: string;
            caption?: string;
          };
          [key: string]: unknown;
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          [key: string]: unknown;
        }>;
      };
      field?: string;
    }>;
  }>;
}

/**
 * GET Handler: Meta WhatsApp Webhook Verification
 * Meta sends a GET request to verify the webhook URL with hub.mode, hub.verify_token and hub.challenge.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "clinical_cloud_test_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log(
      "[WhatsApp Webhook] ✅ Verificación exitosa de webhook por Meta."
    );
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn(
    `[WhatsApp Webhook] ❌ Fallo en verificación de token. Esperado: "${verifyToken}", Recibido: "${token}"`
  );
  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

/**
 * POST Handler: WhatsApp Incoming Events and Messages
 * Receives incoming messages from Meta WhatsApp Cloud API.
 * Supports text, voice notes (Groq Whisper STT) and graceful media fallbacks.
 */
export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await request.json();

    // Verify this is a WhatsApp Business Account event
    if (body.object !== "whatsapp_business_account" && !body.entry) {
      console.log("[WhatsApp Webhook] Objeto no reconocido en webhook. Ignorando.");
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    // Process all entries and changes safely
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") {
          console.log(`[WhatsApp Webhook] Evento de campo ignorado: ${change.field}`);
          continue;
        }

        const value = change.value;
        if (!value) continue;

        // 1. Filter out message status notifications (sent, delivered, read) to avoid loops
        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            console.log(
              `[WhatsApp Webhook] ℹ️ Notificación de estado de entrega: [${status.status}] para ${status.recipient_id} (ID: ${status.id}). Descartada.`
            );
          }
          continue;
        }

        // 2. Check for inbound messages
        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        for (const message of value.messages) {
          const rawFrom = message.from;
          const messageId = message.id;
          const messageType = message.type || "unknown";
          const textBody = message.text?.body;
          const contactName =
            value.contacts?.[0]?.profile?.name || "Paciente";

          if (!rawFrom) {
            console.warn("[WhatsApp Webhook] Mensaje recibido sin remitente 'from'. Descartando.");
            continue;
          }

          const cleanFrom = rawFrom.replace(/\D/g, "");
          let effectiveText = textBody?.trim() || "";

          // Handle Audio / Voice Notes (Fase 2: Groq Whisper STT)
          if (messageType === "audio" || messageType === "voice") {
            const mediaId =
              (message.audio as { id?: string })?.id ||
              (message.voice as { id?: string })?.id;
            console.log(
              `[WhatsApp Webhook] 🎙️ Recibida nota de voz/audio de ${cleanFrom} (Media ID: ${mediaId || "N/A"})`
            );

            if (mediaId) {
              const mediaInfo = await getWhatsAppMediaInfo(mediaId);
              if (mediaInfo.success && mediaInfo.data?.url) {
                const downloadRes = await downloadWhatsAppMediaBuffer(
                  mediaInfo.data.url
                );
                if (downloadRes.success && downloadRes.buffer) {
                  const transcription = await transcribeAudioVoiceNote(
                    downloadRes.buffer,
                    "voice_note.ogg",
                    mediaInfo.data.mime_type || "audio/ogg"
                  );
                  if (transcription.success && transcription.text) {
                    effectiveText = transcription.text;
                    console.log(
                      `[WhatsApp Webhook] 🎙️ Nota de voz transcrita: "${effectiveText}"`
                    );
                  }
                }
              }
            }

            // If audio transcription failed or yielded no text, send polite fallback
            if (!effectiveText) {
              console.warn(
                `[WhatsApp Webhook] ⚠️ No se pudo transcribir el audio de ${cleanFrom}. Enviando mensaje alternativo.`
              );
              await sendWhatsAppMessage(
                cleanFrom,
                "He recibido tu nota de voz, pero por el momento tuve dificultad al escucharla con claridad. ¿Podrías escribirme tu consulta brevemente por este medio para asistirte de inmediato?"
              );
              continue;
            }
          } else if (
            messageType === "image" ||
            messageType === "document" ||
            messageType === "video"
          ) {
            // Fase 1: Respuesta amigable para imágenes/documentos
            console.log(
              `[WhatsApp Webhook] 🖼️ Archivo/Imagen recibido (${messageType}) de ${cleanFrom}. Enviando respuesta orientativa.`
            );
            await sendWhatsAppMessage(
              cleanFrom,
              "He recibido tu archivo. Por el momento mi sistema procesa mensajes de texto y notas de voz. ¿Podrías indicarme tu consulta por escrito o mediante un audio para asistirte con gusto?"
            );
            continue;
          } else if (messageType !== "text" || !effectiveText) {
            console.log(
              `[WhatsApp Webhook] ⚠️ Mensaje no procesable (Tipo: ${messageType}) de ${cleanFrom}. Se descarta.`
            );
            continue;
          }

          // Execute orchestrator with effectiveText (from text message or transcribed voice note)
          await Promise.race([
            handleInboundWhatsAppMessage({
              rawFrom: cleanFrom,
              userText: effectiveText,
              contactName,
              messageId,
            }),
            new Promise((resolve) => setTimeout(resolve, 12000)),
          ]);
        }
      }
    }

    // Acknowledge receipt to Meta immediately
    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] ❌ Error al procesar payload entrante:", error);
    // Return 200 to prevent Meta from retrying unparseable malformed payloads
    return NextResponse.json({ status: "error_acknowledged" }, { status: 200 });
  }
}
