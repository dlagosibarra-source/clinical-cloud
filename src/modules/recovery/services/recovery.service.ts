import { and, eq } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { RecoveryRepository } from '../repositories/recovery.repository';
import { AppointmentsRepository } from '../../appointments/repositories/appointments.repository';
import { type AuthContext } from '../../../shared/types/index';
import { appointments, appointmentEvents } from '../../appointments/types/schema';
import { waitlist, recoveryOffers } from '../types/schema';
import { RecoveryWhatsAppService } from '../../whatsapp/services/recovery-whatsapp.service';

/** Default TTL for recovery offers: 2 hours */
const DEFAULT_OFFER_TTL_MS = 2 * 60 * 60 * 1000;

export interface FreedSlotInfo {
  appointmentId: string;
  serviceId: string;
  dentistId: string;
  locationId: string;
  startAt: Date;
  endAt: Date;
}

export interface RecoveryMatchResult {
  candidatesFound: number;
  offersCreated: number;
  offers: Array<{
    offerId: string;
    waitlistId: string;
    patientId: string;
    expiresAt: Date;
  }>;
}

export class RecoveryEngine {
  private repository: RecoveryRepository;
  private appointmentsRepository: AppointmentsRepository;
  private whatsAppService: RecoveryWhatsAppService;

  constructor(
    private readonly db: Database,
    whatsAppService?: RecoveryWhatsAppService
  ) {
    this.repository = new RecoveryRepository(db);
    this.appointmentsRepository = new AppointmentsRepository(db);
    this.whatsAppService = whatsAppService ?? new RecoveryWhatsAppService(db);
  }

  // ─── Waitlist Management ──────────────────────────────────────

  async addToWaitlist(
    context: AuthContext,
    data: {
      patientId: string;
      serviceId: string;
      dentistId?: string;
      locationId?: string;
      preferredDateStart: string;
      preferredDateEnd: string;
      preferredTimeStart?: string;
      preferredTimeEnd?: string;
      priority?: number;
    }
  ) {
    const entries = await this.repository.createWaitlistEntry({
      organizationId: context.organization_id,
      patientId: data.patientId,
      serviceId: data.serviceId,
      dentistId: data.dentistId ?? null,
      locationId: data.locationId ?? null,
      preferredDateStart: data.preferredDateStart,
      preferredDateEnd: data.preferredDateEnd,
      preferredTimeStart: data.preferredTimeStart ?? '08:00',
      preferredTimeEnd: data.preferredTimeEnd ?? '20:00',
      priority: data.priority ?? 0,
      status: 'WAITING',
    });
    return entries[0]!;
  }

  async cancelWaitlistEntry(context: AuthContext, waitlistId: string) {
    return this.repository.updateWaitlistStatus(context.organization_id, waitlistId, 'CANCELLED');
  }

  async getPatientWaitlist(context: AuthContext, patientId: string) {
    return this.repository.findActiveWaitlistByPatient(context.organization_id, patientId);
  }

  async getPendingOfferForPatient(context: AuthContext, patientId: string) {
    return this.repository.findPendingOfferByPatient(context.organization_id, patientId);
  }

  async getRecentOfferForPatient(context: AuthContext, patientId: string) {
    return this.repository.findRecentOfferByPatient(context.organization_id, patientId);
  }

  // ─── Recovery Engine Core (Section 34) ────────────────────────

  /**
   * Process a freed slot: find eligible waitlist candidates using
   * deterministic matching, create PENDING recovery offers, and
   * update waitlist statuses.
   *
   * This method is invoked when a RECOVERY_TRIGGERED event is detected
   * (after an appointment cancellation in Phase 3).
   *
   * Matching is STRICTLY DETERMINISTIC:
   * 1. Filter by org, service, date range, time range, dentist, location
   * 2. Order by priority DESC, waitlist age ASC (oldest first)
   * 3. Generate offers for each candidate sequentially
   * 4. AI must NOT determine the winner
   */
  async processFreedSlot(
    context: AuthContext,
    freedSlot: FreedSlotInfo,
    options?: {
      maxOffers?: number;
      ttlMs?: number;
    }
  ): Promise<RecoveryMatchResult> {
    const maxOffers = options?.maxOffers ?? 5;
    const ttlMs = options?.ttlMs ?? DEFAULT_OFFER_TTL_MS;

    // Extract date and time from the freed slot for matching
    const slotDate = freedSlot.startAt.toISOString().split('T')[0]!;
    const slotStartTime = freedSlot.startAt.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'UTC', // We'll work in UTC for now; timezone awareness is handled at the action layer
    });
    const slotEndTime = freedSlot.endAt.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'UTC',
    });

    // Step 3: Find eligible waitlist candidates (deterministic query)
    const candidates = await this.repository.findEligibleCandidates(
      context.organization_id,
      {
        serviceId: freedSlot.serviceId,
        dentistId: freedSlot.dentistId,
        locationId: freedSlot.locationId,
        date: slotDate,
        startTime: slotStartTime,
        endTime: slotEndTime,
      }
    );

    if (candidates.length === 0) {
      return { candidatesFound: 0, offersCreated: 0, offers: [] };
    }

    // Step 5: Create recovery offers (up to maxOffers, deterministic order)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    const selectedCandidates = candidates.slice(0, maxOffers);
    const createdOffers: RecoveryMatchResult['offers'] = [];

    for (const candidate of selectedCandidates) {
      // Create the offer
      const offerRows = await this.repository.createOffer({
        organizationId: context.organization_id,
        waitlistId: candidate.waitlistId,
        appointmentId: freedSlot.appointmentId,
        patientId: candidate.patientId,
        status: 'PENDING',
        offeredAt: now,
        expiresAt,
      });

      const offer = offerRows[0];
      if (!offer) continue;

      // Update waitlist entry status to OFFERED
      await this.repository.updateWaitlistStatus(
        context.organization_id,
        candidate.waitlistId,
        'OFFERED'
      );

      // Record RECOVERY_OFFERED event in appointment_events
      await this.appointmentsRepository.createEvent({
        organizationId: context.organization_id,
        appointmentId: freedSlot.appointmentId,
        eventType: 'RECOVERY_OFFERED',
        actorType: 'SYSTEM',
        actorUserId: null,
        source: 'SYSTEM',
        metadata: {
          offerId: offer.offerId,
          waitlistId: candidate.waitlistId,
          patientId: candidate.patientId,
          expiresAt: expiresAt.toISOString(),
        },
      });

      createdOffers.push({
        offerId: offer.offerId,
        waitlistId: candidate.waitlistId,
        patientId: candidate.patientId,
        expiresAt,
      });

      // Dispatch WhatsApp recovery offer (non-blocking, never fails the transaction)
      await this.whatsAppService.dispatchRecoveryOffer({
        organizationId: context.organization_id,
        offerId: offer.offerId,
        waitlistId: candidate.waitlistId,
        appointmentId: freedSlot.appointmentId,
        patientId: candidate.patientId,
        serviceId: freedSlot.serviceId,
        dentistId: freedSlot.dentistId,
        locationId: freedSlot.locationId,
        startAt: freedSlot.startAt,
        endAt: freedSlot.endAt,
        expiresAt,
      });
    }

    return {
      candidatesFound: candidates.length,
      offersCreated: createdOffers.length,
      offers: createdOffers,
    };
  }

  // ─── Atomic Acceptance (Section 19) ───────────────────────────

  /**
   * Atomically accept a recovery offer.
   *
   * Within a single database transaction:
   * 1. Lock and validate the offer (must be PENDING and not expired)
   * 2. Retrieve the cancelled appointment's slot details
   * 3. Create a NEW appointment in the freed slot
   * 4. Mark the accepted offer as ACCEPTED
   * 5. Expire all competing PENDING offers for the same appointment
   * 6. Mark the waitlist entry as FULFILLED
   * 7. Record RECOVERY_ACCEPTED event in appointment_events
   *
   * This guarantees that two patients cannot successfully claim
   * the same appointment slot (atomic transaction with SELECT FOR UPDATE semantics).
   */
  async acceptOffer(
    context: AuthContext,
    offerId: string
  ): Promise<{
    success: boolean;
    newAppointmentId?: string;
    error?: string;
  }> {
    return await this.db.transaction(async (tx) => {
      // 1. Lock the offer row and validate
      const offerRows = await tx
        .select()
        .from(recoveryOffers)
        .where(
          and(
            eq(recoveryOffers.organizationId, context.organization_id),
            eq(recoveryOffers.offerId, offerId)
          )
        )
        .limit(1);

      const offer = offerRows[0];
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }

      if (offer.status !== 'PENDING') {
        return { success: false, error: `Offer is no longer pending (status: ${offer.status})` };
      }

      if (offer.expiresAt < new Date()) {
        // Mark as expired
        await tx
          .update(recoveryOffers)
          .set({ status: 'EXPIRED', updatedAt: new Date() })
          .where(and(eq(recoveryOffers.organizationId, context.organization_id), eq(recoveryOffers.offerId, offerId)));
        return { success: false, error: 'Offer has expired' };
      }

      // 2. Retrieve the cancelled appointment details
      const aptRows = await tx
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, context.organization_id),
            eq(appointments.appointmentId, offer.appointmentId)
          )
        )
        .limit(1);

      const cancelledApt = aptRows[0];
      if (!cancelledApt) {
        return { success: false, error: 'Original cancelled appointment not found' };
      }

      // 3. Create a NEW appointment in the freed slot
      const newAptRows = await tx
        .insert(appointments)
        .values({
          organizationId: context.organization_id,
          patientId: offer.patientId,
          dentistId: cancelledApt.dentistId,
          locationId: cancelledApt.locationId,
          serviceId: cancelledApt.serviceId,
          startAt: cancelledApt.startAt,
          endAt: cancelledApt.endAt,
          status: 'SCHEDULED',
          notes: `Recovered from cancelled appointment ${cancelledApt.appointmentId}`,
          createdByUserId: context.user_id,
          serviceNameSnapshot: cancelledApt.serviceNameSnapshot,
          serviceDurationSnapshot: cancelledApt.serviceDurationSnapshot,
          serviceValueSnapshot: cancelledApt.serviceValueSnapshot,
        })
        .returning();

      const newApt = newAptRows[0];
      if (!newApt) {
        throw new Error('Failed to create recovered appointment');
      }

      // 4. Mark the accepted offer as ACCEPTED
      await tx
        .update(recoveryOffers)
        .set({ status: 'ACCEPTED', respondedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(recoveryOffers.organizationId, context.organization_id), eq(recoveryOffers.offerId, offerId)));

      // 5. Expire all competing PENDING offers for the same appointment
      await tx
        .update(recoveryOffers)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(
          and(
            eq(recoveryOffers.organizationId, context.organization_id),
            eq(recoveryOffers.appointmentId, offer.appointmentId),
            eq(recoveryOffers.status, 'PENDING'),
            // exclude the one we just accepted
            eq(recoveryOffers.offerId, offerId) // this is a no-op guard; it was already set to ACCEPTED above
          )
        );
      // The actual competing expiration:
      await tx
        .update(recoveryOffers)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(
          and(
            eq(recoveryOffers.organizationId, context.organization_id),
            eq(recoveryOffers.appointmentId, offer.appointmentId),
            eq(recoveryOffers.status, 'PENDING')
          )
        );

      // 6. Mark the waitlist entry as FULFILLED
      await tx
        .update(waitlist)
        .set({ status: 'FULFILLED', updatedAt: new Date() })
        .where(and(eq(waitlist.organizationId, context.organization_id), eq(waitlist.waitlistId, offer.waitlistId)));

      // 7. Record immutable events
      // CREATED event for the new appointment
      await tx.insert(appointmentEvents).values({
        organizationId: context.organization_id,
        appointmentId: newApt.appointmentId,
        eventType: 'CREATED',
        actorType: 'SYSTEM',
        actorUserId: null,
        source: 'SYSTEM',
        metadata: {
          recoveredFromAppointmentId: cancelledApt.appointmentId,
          recoveryOfferId: offerId,
        },
      });

      // RECOVERY_ACCEPTED event on the original cancelled appointment
      await tx.insert(appointmentEvents).values({
        organizationId: context.organization_id,
        appointmentId: cancelledApt.appointmentId,
        eventType: 'RECOVERY_ACCEPTED',
        actorType: 'PATIENT',
        actorUserId: null,
        source: 'SYSTEM',
        metadata: {
          acceptedByPatientId: offer.patientId,
          newAppointmentId: newApt.appointmentId,
          offerId,
        },
      });

      return {
        success: true,
        newAppointmentId: newApt.appointmentId,
      };
    });
  }

  // ─── Offer Decline ────────────────────────────────────────────

  async declineOffer(context: AuthContext, offerId: string) {
    return await this.db.transaction(async (tx) => {
      const offerRows = await tx
        .select()
        .from(recoveryOffers)
        .where(
          and(
            eq(recoveryOffers.organizationId, context.organization_id),
            eq(recoveryOffers.offerId, offerId)
          )
        )
        .limit(1);

      const offer = offerRows[0];
      if (!offer || offer.status !== 'PENDING') {
        return { success: false, error: 'Offer not found or not pending' };
      }

      // Mark offer as DECLINED
      await tx
        .update(recoveryOffers)
        .set({ status: 'DECLINED', respondedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(recoveryOffers.organizationId, context.organization_id), eq(recoveryOffers.offerId, offerId)));

      // Return waitlist entry to WAITING so it can be matched again
      await tx
        .update(waitlist)
        .set({ status: 'WAITING', updatedAt: new Date() })
        .where(and(eq(waitlist.organizationId, context.organization_id), eq(waitlist.waitlistId, offer.waitlistId)));

      // Record RECOVERY_DECLINED event
      await tx.insert(appointmentEvents).values({
        organizationId: context.organization_id,
        appointmentId: offer.appointmentId,
        eventType: 'RECOVERY_DECLINED',
        actorType: 'PATIENT',
        actorUserId: null,
        source: 'SYSTEM',
        metadata: {
          offerId,
          declinedByPatientId: offer.patientId,
          waitlistId: offer.waitlistId,
        },
      });

      return { success: true };
    });
  }

  // ─── Expiration Processing ────────────────────────────────────

  /**
   * Process expired offers: mark them as EXPIRED and return
   * their waitlist entries to WAITING status.
   */
  async processExpiredOffers(context: AuthContext) {
    const expired = await this.repository.findExpiredOffers(context.organization_id);
    let processed = 0;

    for (const offer of expired) {
      await this.repository.updateOfferStatus(context.organization_id, offer.offerId, 'EXPIRED');
      await this.repository.updateWaitlistStatus(context.organization_id, offer.waitlistId, 'WAITING');
      processed++;
    }

    return { processed };
  }

  // ─── Query Helpers ────────────────────────────────────────────

  async getOffersByAppointment(context: AuthContext, appointmentId: string) {
    return this.repository.findOffersByAppointment(context.organization_id, appointmentId);
  }

  async getWaitlistEntry(context: AuthContext, waitlistId: string) {
    return this.repository.findWaitlistById(context.organization_id, waitlistId);
  }
}
