import { type Database, db } from '../../../shared/database';
import { WhatsAppRepository } from '../repositories/whatsapp.repository';
import { PatientsRepository } from '../../patients/repositories/patients.repository';
import { ServicesRepository } from '../../services/repositories/services.repository';
import { DentistsRepository } from '../../dentists/repositories/dentists.repository';
import { LocationsRepository } from '../../locations/repositories/locations.repository';
import { AppointmentsRepository } from '../../appointments/repositories/appointments.repository';
import { RecoveryEngine } from '../../recovery/services/recovery.service';
import { sendWhatsAppMessage } from '../../ai/services/whatsapp.service';
import { handleInboundWhatsAppMessage } from '../../ai/orchestrator/whatsapp-ai-orchestrator';
import { getAuthenticatedContext } from '../../../shared/auth/server-context';
import { type AuthContext } from '../../../shared/types/index';

/**
 * Detects whether the patient's message expresses an acceptance
 * or rejection intent for an outstanding recovery offer.
 */
export function detectRecoveryIntent(text: string): 'ACCEPT' | 'DECLINE' | null {
  if (!text) return null;

  // Normalize text: remove accents, trim, uppercase, remove punctuation
  const norm = text
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Acceptance patterns:
  const exactAccepts = ['ACEPTO', 'ACEPTAR', 'CONFIRMO', 'CONFIRMAR', 'SI', '1', 'S', 'YES', 'OK', 'LO QUIERO', 'DE ACUERDO', 'ME INTERESA'];
  if (exactAccepts.includes(norm)) return 'ACCEPT';

  if (
    /\b(ACEPTO|CONFIRMO|ACEPTAR|CONFIRMAR)\b/i.test(norm) ||
    /^(SI|YES|OK)\s+(LO QUIERO|CONFIRMO|ACEPTO|ME INTERESA|QUIERO|POR FAVOR|LA QUIERO)/i.test(norm) ||
    /^(QUIERO LA CITA|ME QUEDO CON EL ESPACIO|SI POR FAVOR|SI ME INTERESA|SI LA QUIERO)/i.test(norm)
  ) {
    return 'ACCEPT';
  }

  // Decline patterns:
  const exactDeclines = ['RECHAZO', 'RECHAZAR', 'NO', '2', 'N', 'DECLINO', 'DECLINAR', 'NO PUEDO', 'NO GRACIAS', 'CANCELAR'];
  if (exactDeclines.includes(norm)) return 'DECLINE';

  if (
    /\b(RECHAZO|RECHAZAR|DECLINO|DECLINAR)\b/i.test(norm) ||
    /^NO\s+(PUEDO|GRACIAS|LA QUIERO|ME INTERESA|QUIERO|POR EL MOMENTO)/i.test(norm)
  ) {
    return 'DECLINE';
  }

  return null;
}

export interface InboundMessageParams {
  rawFrom: string;
  userText: string;
  contactName?: string;
  messageId?: string;
  messageType?: string;
  organizationId?: string;
}

export interface InboundMessageResult {
  handled: boolean;
  type: 'RECOVERY_ACCEPT' | 'RECOVERY_DECLINE' | 'AI_CHAT' | 'DUPLICATE' | 'IGNORED';
  replyText?: string;
  interactionId?: string;
  error?: string;
}

/**
 * Service to process incoming WhatsApp messages.
 * Handles deduplication, INBOUND message persistence in PostgreSQL,
 * recovery offer intent detection, atomic acceptance/rejection,
 * and AI delegation for general queries.
 */
export class InboundWhatsAppService {
  private whatsappRepo: WhatsAppRepository;
  private patientsRepo: PatientsRepository;
  private servicesRepo: ServicesRepository;
  private dentistsRepo: DentistsRepository;
  private locationsRepo: LocationsRepository;
  private appointmentsRepo: AppointmentsRepository;
  private recoveryEngine: RecoveryEngine;

  constructor(private readonly database: Database = db) {
    this.whatsappRepo = new WhatsAppRepository(database);
    this.patientsRepo = new PatientsRepository(database);
    this.servicesRepo = new ServicesRepository(database);
    this.dentistsRepo = new DentistsRepository(database);
    this.locationsRepo = new LocationsRepository(database);
    this.appointmentsRepo = new AppointmentsRepository(database);
    this.recoveryEngine = new RecoveryEngine(database);
  }

  async processIncomingMessage(input: InboundMessageParams): Promise<InboundMessageResult> {
    const { rawFrom, userText, contactName = 'Paciente', messageId, messageType = 'text', organizationId } = input;
    const cleanPhone = rawFrom.replace(/\D/g, '');
    const effectiveText = userText.trim();

    // 1. Resolve multi-tenant context
    let authContext: AuthContext;
    if (organizationId) {
      authContext = {
        user_id: process.env.DEFAULT_USER_ID || '00000000-0000-4000-a000-000000000002',
        organization_id: organizationId,
        role: 'OWNER',
      };
    } else {
      authContext = await getAuthenticatedContext();
    }
    const orgId = authContext.organization_id;

    // 2. Idempotency check: deduplicate providerMessageId (wamid)
    if (messageId) {
      const isDuplicate = await this.whatsappRepo.isMessageProcessed(orgId, messageId);
      if (isDuplicate) {
        console.log(`[InboundWhatsAppService] ⚠️ Mensaje ya procesado (Deduplicación): ${messageId}`);
        return { handled: true, type: 'DUPLICATE' };
      }
    }

    // 3. Resolve or link patient by phone
    const patient = await this.patientsRepo.findByPhone(orgId, cleanPhone);

    // 4. Ensure conversation thread exists & immediately persist INBOUND message in PostgreSQL
    const conversation = await this.whatsappRepo.findOrCreateConversation(
      orgId,
      cleanPhone,
      patient?.patientId
    );

    const inboundMsg = await this.whatsappRepo.createMessage(orgId, {
      conversationId: conversation.conversationId,
      patientId: patient?.patientId ?? null,
      direction: 'INBOUND',
      type: messageType === 'audio' || messageType === 'voice' ? 'AUDIO' : 'TEXT',
      body: effectiveText,
      status: 'RECEIVED',
      providerMessageId: messageId,
    });
    console.log(
      `[InboundWhatsAppService] 📥 Mensaje INBOUND registrado en PostgreSQL (ID: ${inboundMsg.messageId}) de ${cleanPhone}`
    );

    // 5. Detect recovery intent & check active or recently expired offer
    const intent = detectRecoveryIntent(effectiveText);

    if (patient && intent) {
      const recentOffer = await this.recoveryEngine.getRecentOfferForPatient(
        authContext,
        patient.patientId
      );

      if (recentOffer) {
        console.log(
          `[InboundWhatsAppService] 🎯 Oferta reciente detectada para paciente ${patient.firstName} (${patient.patientId}) - Oferta: ${recentOffer.offerId}, Status: ${recentOffer.status}, Intención: ${intent}`
        );

        if (intent === 'ACCEPT') {
          // If the offer is already expired, send the polite apology message directly
          if (recentOffer.status === 'EXPIRED') {
            console.log(
              `[InboundWhatsAppService] ⏳ Paciente ${patient.firstName} intentó aceptar oferta ya EXPIRADA (${recentOffer.offerId})`
            );
            const apologyBody = [
              `Hola, ${patient.firstName}.`,
              `Lamentamos informarte que este espacio ya fue tomado o la oferta ha expirado. ⏳`,
              ``,
              `¡No te preocupes! Sigues en nuestra lista de espera con prioridad para la próxima disponibilidad que se libere. Te notificaremos de inmediato.`,
            ].join('\n');

            const sendResult = await sendWhatsAppMessage(cleanPhone, apologyBody);

            await this.whatsappRepo.createMessage(orgId, {
              conversationId: conversation.conversationId,
              patientId: patient.patientId,
              direction: 'OUTBOUND',
              type: 'TEXT',
              body: apologyBody,
              status: sendResult.success ? 'SENT' : 'FAILED',
              providerMessageId: sendResult.messageId,
              metadata: {
                recoveryOfferId: recentOffer.offerId,
                error: 'Offer is no longer pending (status: EXPIRED)',
              },
            });

            return {
              handled: true,
              type: 'RECOVERY_ACCEPT',
              replyText: apologyBody,
              error: 'Offer is no longer pending (status: EXPIRED)',
            };
          }

          // Otherwise, status is PENDING -> proceed with atomic acceptOffer
          const acceptResult = await this.recoveryEngine.acceptOffer(authContext, recentOffer.offerId);

          if (acceptResult.success && acceptResult.newAppointmentId) {
            // Retrieve appointment details for confirmation message
            const newApt = await this.appointmentsRepo.findById(orgId, acceptResult.newAppointmentId);
            const dentist = newApt?.dentistId ? await this.dentistsRepo.findById(orgId, newApt.dentistId) : null;
            const location = newApt?.locationId ? await this.locationsRepo.findById(orgId, newApt.locationId) : null;
            const service = newApt?.serviceId ? await this.servicesRepo.findById(orgId, newApt.serviceId) : null;

            const serviceName = newApt?.serviceNameSnapshot || service?.name || 'Consulta Dental';
            const dentistName = dentist ? `Dr(a). ${dentist.firstName} ${dentist.lastName}`.trim() : 'Especialista de turno';
            const locationName = location?.name || 'Sucursal Principal';

            const startAt = newApt?.startAt ? new Date(newApt.startAt) : new Date();
            const endAt = newApt?.endAt ? new Date(newApt.endAt) : new Date();

            const formattedDate = startAt.toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            });
            const startTime = startAt.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: 'UTC',
            });
            const endTime = endAt.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: 'UTC',
            });

            const confirmationBody = [
              `¡Excelente, ${patient.firstName}! 🎉`,
              `Tu cita ha quedado confirmada con éxito:`,
              ``,
              `• Tratamiento: ${serviceName}`,
              `• Especialista: ${dentistName}`,
              `• Fecha: ${formattedDate}`,
              `• Horario: ${startTime} - ${endTime}`,
              `• Sucursal: ${locationName}`,
              ``,
              `Te esperamos puntualmente. Si requieres algún cambio o indicación previa, avísanos por este medio.`,
            ].join('\n');

            // Dispatch confirmation via WhatsApp
            const sendResult = await sendWhatsAppMessage(cleanPhone, confirmationBody);

            await this.whatsappRepo.createMessage(orgId, {
              conversationId: conversation.conversationId,
              patientId: patient.patientId,
              direction: 'OUTBOUND',
              type: 'TEXT',
              body: confirmationBody,
              status: sendResult.success ? 'SENT' : 'FAILED',
              providerMessageId: sendResult.messageId,
              metadata: {
                recoveryOfferId: recentOffer.offerId,
                newAppointmentId: acceptResult.newAppointmentId,
                acceptedVia: 'WHATSAPP_INBOUND',
              },
            });

            return {
              handled: true,
              type: 'RECOVERY_ACCEPT',
              replyText: confirmationBody,
            };
          } else {
            // Offer was already claimed or expired
            const apologyBody = [
              `Hola, ${patient.firstName}.`,
              `Lamentamos informarte que este espacio ya fue tomado o la oferta ha expirado. ⏳`,
              ``,
              `¡No te preocupes! Sigues en nuestra lista de espera con prioridad para la próxima disponibilidad que se libere. Te notificaremos de inmediato.`,
            ].join('\n');

            const sendResult = await sendWhatsAppMessage(cleanPhone, apologyBody);

            await this.whatsappRepo.createMessage(orgId, {
              conversationId: conversation.conversationId,
              patientId: patient.patientId,
              direction: 'OUTBOUND',
              type: 'TEXT',
              body: apologyBody,
              status: sendResult.success ? 'SENT' : 'FAILED',
              providerMessageId: sendResult.messageId,
              metadata: {
                recoveryOfferId: recentOffer.offerId,
                error: acceptResult.error,
              },
            });

            return {
              handled: true,
              type: 'RECOVERY_ACCEPT',
              replyText: apologyBody,
              error: acceptResult.error,
            };
          }
        } else if (intent === 'DECLINE') {
          // If pending, decline offer in RecoveryEngine
          if (recentOffer.status === 'PENDING') {
            await this.recoveryEngine.declineOffer(authContext, recentOffer.offerId);
          }

          const declineBody = [
            `Entendido, ${patient.firstName}. Hemos registrado tu respuesta.`,
            ``,
            `Tu lugar en la lista de espera permanece activo y con tu misma prioridad para futuras fechas. ¡Te notificaremos en cuanto tengamos otro espacio disponible!`,
          ].join('\n');

          const sendResult = await sendWhatsAppMessage(cleanPhone, declineBody);

          await this.whatsappRepo.createMessage(orgId, {
            conversationId: conversation.conversationId,
            patientId: patient.patientId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            body: declineBody,
            status: sendResult.success ? 'SENT' : 'FAILED',
            providerMessageId: sendResult.messageId,
            metadata: {
              recoveryOfferId: recentOffer.offerId,
              declinedVia: 'WHATSAPP_INBOUND',
            },
          });

          return {
            handled: true,
            type: 'RECOVERY_DECLINE',
            replyText: declineBody,
          };
        }
      }
    }

    // 6. If not a recovery offer response, forward to AI Clinical Orchestrator
    const aiResult = await handleInboundWhatsAppMessage({
      rawFrom: cleanPhone,
      userText: effectiveText,
      contactName,
      messageId,
      organizationId: orgId,
      conversationId: conversation.conversationId,
      inboundDbMessageId: inboundMsg.messageId,
    });

    return {
      handled: true,
      type: 'AI_CHAT',
      replyText: aiResult.replyText,
      interactionId: aiResult.interactionId,
      error: aiResult.error,
    };
  }
}
