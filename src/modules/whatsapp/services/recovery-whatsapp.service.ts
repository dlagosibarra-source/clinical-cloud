import { type Database } from '../../../shared/database';
import { WhatsAppRepository } from '../repositories/whatsapp.repository';
import { PatientsRepository } from '../../patients/repositories/patients.repository';
import { ServicesRepository } from '../../services/repositories/services.repository';
import { DentistsRepository } from '../../dentists/repositories/dentists.repository';
import { sendWhatsAppMessage } from '../../ai/services/whatsapp.service';

export interface DispatchRecoveryOfferParams {
  organizationId: string;
  offerId: string;
  waitlistId: string;
  appointmentId: string;
  patientId: string;
  serviceId: string;
  dentistId: string;
  locationId?: string | null;
  startAt: Date;
  endAt: Date;
  expiresAt: Date;
}

export interface DispatchRecoveryOfferResult {
  dispatched: boolean;
  messageId?: string;
  error?: string;
  reason?: string;
}

/**
 * Service to dispatch recovery offers to patients via WhatsApp.
 * Adheres strictly to the architectural rule:
 * "WhatsApp failures must NOT roll back core appointment or recovery transactions."
 */
export class RecoveryWhatsAppService {
  private whatsappRepo: WhatsAppRepository;
  private patientsRepo: PatientsRepository;
  private servicesRepo: ServicesRepository;
  private dentistsRepo: DentistsRepository;

  constructor(private readonly db: Database) {
    this.whatsappRepo = new WhatsAppRepository(db);
    this.patientsRepo = new PatientsRepository(db);
    this.servicesRepo = new ServicesRepository(db);
    this.dentistsRepo = new DentistsRepository(db);
  }

  /**
   * Formats and dispatches a recovery offer message to a patient.
   * Encapsulates the entire external Meta API call in a non-blocking try/catch.
   * If Meta fails, the error is recorded in `whatsapp_messages` with status 'FAILED',
   * but NO error is thrown to the caller.
   */
  async dispatchRecoveryOffer(
    params: DispatchRecoveryOfferParams
  ): Promise<DispatchRecoveryOfferResult> {
    const {
      organizationId,
      offerId,
      waitlistId,
      appointmentId,
      patientId,
      serviceId,
      dentistId,
      startAt,
      endAt,
      expiresAt,
    } = params;

    try {
      // 1. Resolve patient information
      const patient = await this.patientsRepo.findById(organizationId, patientId);
      if (!patient || !patient.phone) {
        console.warn(
          `[RecoveryWhatsAppService] ⚠️ Paciente ${patientId} no encontrado o sin teléfono.`
        );
        return {
          dispatched: false,
          reason: 'PATIENT_NOT_FOUND_OR_NO_PHONE',
        };
      }

      // 2. Check WhatsApp opt-in consent (MVP Spec Section 14 / Section 21)
      if (!patient.whatsappOptIn) {
        console.log(
          `[RecoveryWhatsAppService] ℹ️ Paciente ${patient.firstName} ${patient.lastName} no tiene whatsapp_opt_in activo. Omitiendo envío.`
        );
        return {
          dispatched: false,
          reason: 'PATIENT_OPT_IN_FALSE',
        };
      }

      // 3. Resolve context details for the template (Service & Dentist)
      const service = await this.servicesRepo.findById(organizationId, serviceId);
      const dentist = await this.dentistsRepo.findById(organizationId, dentistId);

      const serviceName = service?.name || 'Consulta Dental';
      const dentistName = dentist
        ? `Dr(a). ${dentist.firstName} ${dentist.lastName}`.trim()
        : 'Especialista de turno';

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
      const expiresTime = expiresAt.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });

      // 4. Find or create the conversation thread in PostgreSQL
      const conversation = await this.whatsappRepo.findOrCreateConversation(
        organizationId,
        patient.phone,
        patient.patientId
      );

      // 5. Construct the recovery offer message
      const messageBody = [
        `¡Hola, ${patient.firstName}! 🦷`,
        `Se ha liberado un espacio en Complident que coincide con tu solicitud en lista de espera:`,
        ``,
        `• Tratamiento: ${serviceName}`,
        `• Especialista: ${dentistName}`,
        `• Fecha: ${formattedDate}`,
        `• Horario: ${startTime} - ${endTime}`,
        ``,
        `⏳ Tienes hasta las ${expiresTime} para confirmar este espacio antes de que sea ofrecido al siguiente paciente.`,
        ``,
        `Responde "ACEPTO" para confirmar tu cita de inmediato o "RECHAZO" para mantenerte en espera de otra fecha.`,
      ].join('\n');

      console.log(
        `[RecoveryWhatsAppService] 🚀 Despachando oferta ${offerId} a ${patient.phone} (Paciente: ${patient.firstName})`
      );

      // 6. Dispatch to Meta Graph API v21.0
      const sendResult = await sendWhatsAppMessage(patient.phone, messageBody);

      if (sendResult.success) {
        // Record successful outbound message in PostgreSQL
        await this.whatsappRepo.createMessage(organizationId, {
          conversationId: conversation.conversationId,
          patientId: patient.patientId,
          providerMessageId: sendResult.messageId ?? null,
          direction: 'OUTBOUND',
          type: 'TEXT',
          body: messageBody,
          status: 'SENT',
          metadata: {
            offerId,
            waitlistId,
            appointmentId,
            expiresAt: expiresAt.toISOString(),
          },
        });

        console.log(
          `[RecoveryWhatsAppService] ✅ Oferta ${offerId} enviada a WhatsApp con éxito (ID: ${sendResult.messageId}).`
        );

        return {
          dispatched: true,
          messageId: sendResult.messageId,
        };
      } else {
        // Meta returned an error (e.g. invalid phone or sandbox limitation)
        console.warn(
          `[RecoveryWhatsAppService] ⚠️ Falló entrega en Meta para oferta ${offerId}: ${sendResult.error}`
        );

        await this.whatsappRepo.createMessage(organizationId, {
          conversationId: conversation.conversationId,
          patientId: patient.patientId,
          direction: 'OUTBOUND',
          type: 'TEXT',
          body: messageBody,
          status: 'FAILED',
          errorCode: 'META_API_ERROR',
          errorMessage: sendResult.error || 'Meta API returned non-OK status',
          metadata: {
            offerId,
            waitlistId,
            appointmentId,
            expiresAt: expiresAt.toISOString(),
          },
        });

        return {
          dispatched: false,
          error: sendResult.error,
        };
      }
    } catch (error) {
      // Catch-all to ensure CORE TRANSACTIONS NEVER ROLL BACK
      const errString = error instanceof Error ? error.message : String(error);
      console.error(
        `[RecoveryWhatsAppService] ❌ Excepción al despachar oferta ${offerId}:`,
        errString
      );

      try {
        const patient = await this.patientsRepo.findById(organizationId, patientId);
        if (patient?.phone) {
          const conversation = await this.whatsappRepo.findOrCreateConversation(
            organizationId,
            patient.phone,
            patient.patientId
          );
          await this.whatsappRepo.createMessage(organizationId, {
            conversationId: conversation.conversationId,
            patientId: patient.patientId,
            direction: 'OUTBOUND',
            type: 'TEXT',
            body: `[Oferta de Recuperación ${offerId}]`,
            status: 'FAILED',
            errorCode: 'DISPATCH_EXCEPTION',
            errorMessage: errString,
            metadata: {
              offerId,
              waitlistId,
              appointmentId,
              expiresAt: expiresAt.toISOString(),
            },
          });
        }
      } catch (logErr) {
        console.error(
          '[RecoveryWhatsAppService] ❌ Error adicional al registrar fallo en DB:',
          logErr
        );
      }

      return {
        dispatched: false,
        error: errString,
      };
    }
  }
}
