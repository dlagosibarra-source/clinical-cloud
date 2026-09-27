import type { Metadata } from "next";
import { getDashboardKPIsAction } from "@/modules/dashboard/actions/dashboard.actions";
import { DashboardView } from "@/modules/dashboard/components/DashboardView";
import type { DashboardKPIs } from "@/modules/dashboard/types";
import { DEFAULT_TIMEZONE, getClinicTodayDateStr } from "@/shared/utils/date-time";

export const metadata: Metadata = {
  title: "Dashboard Operativo | Clinical Cloud",
  description: "Panel operativo clínico con indicadores de ocupación, cancelaciones, Recovery Engine y WhatsApp en tiempo real.",
};

const FALLBACK_KPIS: DashboardKPIs = {
  temporalBanner: "Panel de control clínico",
  todayDateStr: getClinicTodayDateStr(DEFAULT_TIMEZONE),
  timezone: DEFAULT_TIMEZONE,
  todayAppointments: {
    total: 0,
    confirmed: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    activeCount: 0,
    bookedMinutes: 0,
    capacityMinutes: 480,
    occupancyRate: 0,
    schedule: [],
  },
  cancellationAndFallout: {
    totalAppointments: 0,
    cancelledCount: 0,
    noShowCount: 0,
    completedCount: 0,
    cancellationRate: 0,
    noShowRate: 0,
    falloutRate: 0,
  },
  recoveryEngine: {
    totalOffers: 0,
    acceptedOffers: 0,
    expiredOffers: 0,
    declinedOffers: 0,
    pendingOffers: 0,
    recoverySuccessRate: 0,
    recoveredAppointmentsCount: 0,
    estimatedRecoveredValue: 0,
    formattedRecoveredValue: "$0.00 MXN",
  },
  whatsappActivity: {
    totalMessages: 0,
    inboundMessages: 0,
    outboundMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    deliveryRate: 100,
    totalConversations: 0,
    openConversations: 0,
  },
  aiMetrics: {
    totalInteractions: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    successRate: 100,
  },
};

export default async function DashboardPage() {
  const result = await getDashboardKPIsAction();
  const kpis: DashboardKPIs = result.success && result.data ? result.data : FALLBACK_KPIS;

  return (
    <main className="min-h-screen bg-background">
      <DashboardView initialKPIs={kpis} />
    </main>
  );
}
