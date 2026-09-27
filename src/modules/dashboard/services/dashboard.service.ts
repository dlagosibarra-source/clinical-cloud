import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { type Database, db } from '@/shared/database';
import { appointments, appointmentEvents } from '@/modules/appointments/types/schema';
import { recoveryOffers } from '@/modules/recovery/types/schema';
import { whatsappMessages, whatsappConversations } from '@/modules/whatsapp/types/schema';
import { aiInteractions } from '@/modules/ai/types/schema';
import { patients } from '@/modules/patients/types/schema';
import { dentists } from '@/modules/dentists/types/schema';
import {
  getClinicTodayDateStr,
  getLocalDayBounds,
  formatAppointmentTime,
  DEFAULT_TIMEZONE,
} from '@/shared/utils/date-time';
import { getClinicCurrentDateBanner } from '@/modules/ai/services/ai.service';
import type { DashboardKPIs, TodayScheduleItem } from '../types';

export class DashboardService {
  constructor(private readonly database: Database = db) {}

  /**
   * Computes operational KPIs directly via SQL aggregation over transactional tables:
   * - appointments & appointment_events
   * - recovery_offers
   * - whatsapp_messages & whatsapp_conversations
   * - ai_interactions
   *
   * Strictly adheres to Section 35 of MVP_ENGINEERING_SPEC.md:
   * NO metrics table is created or populated.
   */
  async getOperationalKPIs(
    organizationId: string,
    options?: { timezone?: string }
  ): Promise<DashboardKPIs> {
    const timezone = options?.timezone || DEFAULT_TIMEZONE;
    const todayDateStr = getClinicTodayDateStr(timezone);
    const { startOfDay, endOfDay } = getLocalDayBounds(todayDateStr, timezone);
    const temporalBanner = getClinicCurrentDateBanner(timezone);

    // ─────────────────────────────────────────────────────────────
    // 1. TODAY'S APPOINTMENTS & OCCUPANCY RATE
    // ─────────────────────────────────────────────────────────────
    // Get aggregated counts of today's appointments by status
    const todayAggregates = await this.database
      .select({
        status: appointments.status,
        count: sql<number>`count(*)::int`,
        duration: sql<number>`coalesce(sum(${appointments.serviceDurationSnapshot}), 0)::int`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.startAt, startOfDay),
          lte(appointments.startAt, endOfDay)
        )
      )
      .groupBy(appointments.status);

    let confirmedToday = 0;
    let scheduledToday = 0;
    let inProgressToday = 0;
    let completedToday = 0;
    let cancelledToday = 0;
    let noShowToday = 0;
    let bookedMinutes = 0;

    for (const row of todayAggregates) {
      const count = Number(row.count) || 0;
      const duration = Number(row.duration) || 0;

      switch (row.status) {
        case 'CONFIRMED':
          confirmedToday += count;
          bookedMinutes += duration;
          break;
        case 'SCHEDULED':
          scheduledToday += count;
          bookedMinutes += duration;
          break;
        case 'IN_PROGRESS':
          inProgressToday += count;
          bookedMinutes += duration;
          break;
        case 'COMPLETED':
          completedToday += count;
          bookedMinutes += duration;
          break;
        case 'CANCELLED':
          cancelledToday += count;
          break;
        case 'NO_SHOW':
          noShowToday += count;
          break;
        default:
          scheduledToday += count;
          bookedMinutes += duration;
          break;
      }
    }

    const totalToday = confirmedToday + scheduledToday + inProgressToday + completedToday + cancelledToday + noShowToday;
    const activeCount = confirmedToday + scheduledToday + inProgressToday + completedToday;

    // Estimate capacity based on active dentists (standard clinical working day = 8 hrs = 480 mins per doctor)
    const [dentistCountResult] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(dentists)
      .where(
        and(
          eq(dentists.organizationId, organizationId),
          eq(dentists.status, 'ACTIVE')
        )
      );
    const activeDentists = Math.max(1, Number(dentistCountResult?.count) || 1);
    const capacityMinutes = activeDentists * 480;
    const occupancyRate = Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100));

    // Today's upcoming schedule list
    const scheduleRows = await this.database
      .select({
        appointmentId: appointments.appointmentId,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        status: appointments.status,
        serviceName: appointments.serviceNameSnapshot,
        duration: appointments.serviceDurationSnapshot,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        dentistName: sql<string | null>`coalesce(${dentists.professionalName}, concat(${dentists.firstName}, ' ', ${dentists.lastName}))`,
      })
      .from(appointments)
      .leftJoin(
        patients,
        and(
          eq(patients.organizationId, appointments.organizationId),
          eq(patients.patientId, appointments.patientId)
        )
      )
      .leftJoin(
        dentists,
        and(
          eq(dentists.organizationId, appointments.organizationId),
          eq(dentists.dentistId, appointments.dentistId)
        )
      )
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.startAt, startOfDay),
          lte(appointments.startAt, endOfDay)
        )
      )
      .orderBy(appointments.startAt)
      .limit(15);

    const todaySchedule: TodayScheduleItem[] = scheduleRows.map((r) => ({
      appointmentId: r.appointmentId,
      timeStr: formatAppointmentTime(r.startAt, timezone),
      startAt: r.startAt,
      endAt: r.endAt,
      patientName: r.patientFirstName && r.patientLastName
        ? `${r.patientFirstName} ${r.patientLastName}`.trim()
        : 'Paciente',
      patientPhone: r.patientPhone ?? null,
      dentistName: r.dentistName ?? null,
      serviceName: r.serviceName,
      duration: r.duration,
      status: r.status,
    }));

    // ─────────────────────────────────────────────────────────────
    // 2. CANCELLATION AND NO-SHOW RATES
    // ─────────────────────────────────────────────────────────────
    const [appointmentTotals] = await this.database
      .select({
        total: sql<number>`count(*)::int`,
        cancelled: sql<number>`count(case when ${appointments.status} = 'CANCELLED' then 1 end)::int`,
        noShow: sql<number>`count(case when ${appointments.status} = 'NO_SHOW' then 1 end)::int`,
        completed: sql<number>`count(case when ${appointments.status} = 'COMPLETED' then 1 end)::int`,
      })
      .from(appointments)
      .where(eq(appointments.organizationId, organizationId));

    const totalHistoricalAppointments = Number(appointmentTotals?.total) || 0;
    const totalCancelled = Number(appointmentTotals?.cancelled) || 0;
    const totalNoShow = Number(appointmentTotals?.noShow) || 0;
    const totalCompleted = Number(appointmentTotals?.completed) || 0;

    const cancellationRate = totalHistoricalAppointments > 0
      ? Number(((totalCancelled / totalHistoricalAppointments) * 100).toFixed(1))
      : 0;

    const noShowRate = totalHistoricalAppointments > 0
      ? Number(((totalNoShow / totalHistoricalAppointments) * 100).toFixed(1))
      : 0;

    const falloutRate = totalHistoricalAppointments > 0
      ? Number((((totalCancelled + totalNoShow) / totalHistoricalAppointments) * 100).toFixed(1))
      : 0;

    // ─────────────────────────────────────────────────────────────
    // 3. RECOVERY SUCCESS RATE & RESCUED APPOINTMENTS (PHASE 4)
    // ─────────────────────────────────────────────────────────────
    const [recoveryTotals] = await this.database
      .select({
        totalOffers: sql<number>`count(*)::int`,
        accepted: sql<number>`count(case when ${recoveryOffers.status} = 'ACCEPTED' then 1 end)::int`,
        expired: sql<number>`count(case when ${recoveryOffers.status} = 'EXPIRED' then 1 end)::int`,
        declined: sql<number>`count(case when ${recoveryOffers.status} = 'DECLINED' then 1 end)::int`,
        pending: sql<number>`count(case when ${recoveryOffers.status} = 'PENDING' then 1 end)::int`,
        recoveredValue: sql<string>`coalesce(sum(case when ${recoveryOffers.status} = 'ACCEPTED' then ${appointments.serviceValueSnapshot} end), 0)::text`,
      })
      .from(recoveryOffers)
      .leftJoin(
        appointments,
        and(
          eq(appointments.organizationId, recoveryOffers.organizationId),
          eq(appointments.appointmentId, recoveryOffers.appointmentId)
        )
      )
      .where(eq(recoveryOffers.organizationId, organizationId));

    const totalOffers = Number(recoveryTotals?.totalOffers) || 0;
    const acceptedOffers = Number(recoveryTotals?.accepted) || 0;
    const expiredOffers = Number(recoveryTotals?.expired) || 0;
    const declinedOffers = Number(recoveryTotals?.declined) || 0;
    const pendingOffers = Number(recoveryTotals?.pending) || 0;
    const resolvedOffers = acceptedOffers + expiredOffers + declinedOffers;

    const recoverySuccessRate = resolvedOffers > 0
      ? Number(((acceptedOffers / resolvedOffers) * 100).toFixed(1))
      : (totalOffers > 0 ? Number(((acceptedOffers / totalOffers) * 100).toFixed(1)) : 0);

    const estimatedRecoveredValue = parseFloat(recoveryTotals?.recoveredValue || '0') || 0;
    const formattedRecoveredValue = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(estimatedRecoveredValue);

    // ─────────────────────────────────────────────────────────────
    // 4. WHATSAPP ACTIVITY VOLUME (PHASE 6)
    // ─────────────────────────────────────────────────────────────
    const [whatsappTotals] = await this.database
      .select({
        total: sql<number>`count(*)::int`,
        inbound: sql<number>`count(case when ${whatsappMessages.direction} = 'INBOUND' then 1 end)::int`,
        outbound: sql<number>`count(case when ${whatsappMessages.direction} = 'OUTBOUND' then 1 end)::int`,
        delivered: sql<number>`count(case when ${whatsappMessages.status} in ('DELIVERED', 'READ', 'SENT') then 1 end)::int`,
        failed: sql<number>`count(case when ${whatsappMessages.status} = 'FAILED' then 1 end)::int`,
      })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.organizationId, organizationId));

    const [conversationTotals] = await this.database
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(case when ${whatsappConversations.status} = 'OPEN' then 1 end)::int`,
      })
      .from(whatsappConversations)
      .where(eq(whatsappConversations.organizationId, organizationId));

    const totalMessages = Number(whatsappTotals?.total) || 0;
    const inboundMessages = Number(whatsappTotals?.inbound) || 0;
    const outboundMessages = Number(whatsappTotals?.outbound) || 0;
    const deliveredMessages = Number(whatsappTotals?.delivered) || 0;
    const failedMessages = Number(whatsappTotals?.failed) || 0;

    const deliveryRate = outboundMessages > 0
      ? Number(((deliveredMessages / outboundMessages) * 100).toFixed(1))
      : 100;

    // ─────────────────────────────────────────────────────────────
    // 5. AI ENGINE ACTIVITY (PHASE 7)
    // ─────────────────────────────────────────────────────────────
    const [aiTotals] = await this.database
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiInteractions.totalTokens}), 0)::int`,
        avgLatencyMs: sql<number>`coalesce(avg(${aiInteractions.latencyMs}), 0)::int`,
        successCount: sql<number>`count(case when ${aiInteractions.status} = 'SUCCESS' then 1 end)::int`,
      })
      .from(aiInteractions)
      .where(eq(aiInteractions.organizationId, organizationId));

    const totalAiInteractions = Number(aiTotals?.totalCalls) || 0;
    const successfulAiCalls = Number(aiTotals?.successCount) || 0;
    const aiSuccessRate = totalAiInteractions > 0
      ? Number(((successfulAiCalls / totalAiInteractions) * 100).toFixed(1))
      : 100;

    return {
      temporalBanner,
      todayDateStr,
      timezone,
      todayAppointments: {
        total: totalToday,
        confirmed: confirmedToday,
        scheduled: scheduledToday,
        inProgress: inProgressToday,
        completed: completedToday,
        cancelled: cancelledToday,
        noShow: noShowToday,
        activeCount,
        bookedMinutes,
        capacityMinutes,
        occupancyRate,
        schedule: todaySchedule,
      },
      cancellationAndFallout: {
        totalAppointments: totalHistoricalAppointments,
        cancelledCount: totalCancelled,
        noShowCount: totalNoShow,
        completedCount: totalCompleted,
        cancellationRate,
        noShowRate,
        falloutRate,
      },
      recoveryEngine: {
        totalOffers,
        acceptedOffers,
        expiredOffers,
        declinedOffers,
        pendingOffers,
        recoverySuccessRate,
        recoveredAppointmentsCount: acceptedOffers,
        estimatedRecoveredValue,
        formattedRecoveredValue,
      },
      whatsappActivity: {
        totalMessages,
        inboundMessages,
        outboundMessages,
        deliveredMessages,
        failedMessages,
        deliveryRate,
        totalConversations: Number(conversationTotals?.total) || 0,
        openConversations: Number(conversationTotals?.open) || 0,
      },
      aiMetrics: {
        totalInteractions: totalAiInteractions,
        totalTokens: Number(aiTotals?.totalTokens) || 0,
        avgLatencyMs: Math.round(Number(aiTotals?.avgLatencyMs) || 0),
        successRate: aiSuccessRate,
      },
    };
  }
}
