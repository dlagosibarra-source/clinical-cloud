import { and, eq, gte, lte, asc, desc, inArray, notInArray, or, sql } from 'drizzle-orm';
import { type Database } from '../../../shared/database';
import { waitlist, recoveryOffers } from '../types/schema';

export class RecoveryRepository {
  constructor(private readonly db: Database) {}

  // ─── Waitlist ─────────────────────────────────────────────────

  async createWaitlistEntry(data: typeof waitlist.$inferInsert) {
    return this.db.insert(waitlist).values(data).returning();
  }

  async findWaitlistById(organizationId: string, waitlistId: string) {
    const rows = await this.db
      .select()
      .from(waitlist)
      .where(and(eq(waitlist.organizationId, organizationId), eq(waitlist.waitlistId, waitlistId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateWaitlistStatus(organizationId: string, waitlistId: string, status: string) {
    return this.db
      .update(waitlist)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(waitlist.organizationId, organizationId), eq(waitlist.waitlistId, waitlistId)))
      .returning();
  }

  /**
   * Find WAITING candidates that match a freed slot.
   *
   * Matching criteria (Section 34 of Engineering Spec):
   * - Same organization
   * - Compatible service (same serviceId)
   * - Preferred date range includes the freed slot date
   * - Preferred time range includes the freed slot time
   * - If candidate specified a dentist, must match the freed dentist
   * - If candidate specified a location, must match the freed location
   * - Status = 'WAITING'
   *
   * Deterministic ordering: priority DESC (higher first), then created_at ASC (oldest first).
   */
  async findEligibleCandidates(
    organizationId: string,
    freedSlot: {
      serviceId: string;
      dentistId: string;
      locationId: string;
      date: string;        // YYYY-MM-DD
      startTime: string;   // HH:MM
      endTime: string;     // HH:MM
    }
  ) {
    return this.db
      .select()
      .from(waitlist)
      .where(
        and(
          eq(waitlist.organizationId, organizationId),
          eq(waitlist.status, 'WAITING'),
          eq(waitlist.serviceId, freedSlot.serviceId),
          // Date range: freed date falls within patient's preferred range
          lte(waitlist.preferredDateStart, freedSlot.date),
          gte(waitlist.preferredDateEnd, freedSlot.date),
          // Time range: freed slot falls within patient's preferred hours
          lte(waitlist.preferredTimeStart, freedSlot.startTime),
          gte(waitlist.preferredTimeEnd, freedSlot.endTime),
          // Dentist: null means any dentist is acceptable
          or(
            sql`${waitlist.dentistId} IS NULL`,
            eq(waitlist.dentistId, freedSlot.dentistId)
          ),
          // Location: null means any location is acceptable
          or(
            sql`${waitlist.locationId} IS NULL`,
            eq(waitlist.locationId, freedSlot.locationId)
          )
        )
      )
      .orderBy(
        desc(waitlist.priority),
        asc(waitlist.createdAt)
      );
  }

  async findActiveWaitlistByPatient(organizationId: string, patientId: string) {
    return this.db
      .select()
      .from(waitlist)
      .where(
        and(
          eq(waitlist.organizationId, organizationId),
          eq(waitlist.patientId, patientId),
          inArray(waitlist.status, ['WAITING', 'OFFERED'])
        )
      )
      .orderBy(asc(waitlist.createdAt));
  }

  // ─── Recovery Offers ─────────────────────────────────────────

  async createOffer(data: typeof recoveryOffers.$inferInsert) {
    return this.db.insert(recoveryOffers).values(data).returning();
  }

  async findOfferById(organizationId: string, offerId: string) {
    const rows = await this.db
      .select()
      .from(recoveryOffers)
      .where(and(eq(recoveryOffers.organizationId, organizationId), eq(recoveryOffers.offerId, offerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateOfferStatus(organizationId: string, offerId: string, status: string, respondedAt?: Date) {
    return this.db
      .update(recoveryOffers)
      .set({
        status,
        updatedAt: new Date(),
        ...(respondedAt ? { respondedAt } : {}),
      })
      .where(and(eq(recoveryOffers.organizationId, organizationId), eq(recoveryOffers.offerId, offerId)))
      .returning();
  }

  /**
   * Expire all PENDING offers for a given appointment that are NOT the accepted one.
   * Used in atomic acceptance to prevent double-claiming.
   */
  async expireCompetingOffers(organizationId: string, appointmentId: string, excludeOfferId: string) {
    return this.db
      .update(recoveryOffers)
      .set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(
        and(
          eq(recoveryOffers.organizationId, organizationId),
          eq(recoveryOffers.appointmentId, appointmentId),
          eq(recoveryOffers.status, 'PENDING'),
          sql`${recoveryOffers.offerId} != ${excludeOfferId}`
        )
      )
      .returning();
  }

  /**
   * Find all PENDING offers that have expired based on TTL.
   */
  async findExpiredOffers(organizationId: string) {
    return this.db
      .select()
      .from(recoveryOffers)
      .where(
        and(
          eq(recoveryOffers.organizationId, organizationId),
          eq(recoveryOffers.status, 'PENDING'),
          lte(recoveryOffers.expiresAt, new Date())
        )
      );
  }

  async findOffersByAppointment(organizationId: string, appointmentId: string) {
    return this.db
      .select()
      .from(recoveryOffers)
      .where(
        and(
          eq(recoveryOffers.organizationId, organizationId),
          eq(recoveryOffers.appointmentId, appointmentId)
        )
      )
      .orderBy(asc(recoveryOffers.createdAt));
  }

  async findPendingOfferByPatient(organizationId: string, patientId: string) {
    const rows = await this.db
      .select()
      .from(recoveryOffers)
      .where(
        and(
          eq(recoveryOffers.organizationId, organizationId),
          eq(recoveryOffers.patientId, patientId),
          eq(recoveryOffers.status, 'PENDING')
        )
      )
      .orderBy(desc(recoveryOffers.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findRecentOfferByPatient(organizationId: string, patientId: string) {
    const rows = await this.db
      .select()
      .from(recoveryOffers)
      .where(
        and(
          eq(recoveryOffers.organizationId, organizationId),
          eq(recoveryOffers.patientId, patientId),
          inArray(recoveryOffers.status, ['PENDING', 'EXPIRED'])
        )
      )
      .orderBy(desc(recoveryOffers.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }
}
