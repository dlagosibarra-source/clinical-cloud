export interface TodayScheduleItem {
  appointmentId: string;
  timeStr: string;
  startAt: Date;
  endAt: Date;
  patientName: string;
  patientPhone: string | null;
  dentistName: string | null;
  serviceName: string;
  duration: number;
  status: string;
}

export interface DashboardKPIs {
  temporalBanner: string;
  todayDateStr: string;
  timezone: string;
  todayAppointments: {
    total: number;
    confirmed: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    noShow: number;
    activeCount: number;
    bookedMinutes: number;
    capacityMinutes: number;
    occupancyRate: number; // 0-100
    schedule: TodayScheduleItem[];
  };
  cancellationAndFallout: {
    totalAppointments: number;
    cancelledCount: number;
    noShowCount: number;
    completedCount: number;
    cancellationRate: number; // percentage
    noShowRate: number; // percentage
    falloutRate: number; // combined percentage
  };
  recoveryEngine: {
    totalOffers: number;
    acceptedOffers: number;
    expiredOffers: number;
    declinedOffers: number;
    pendingOffers: number;
    recoverySuccessRate: number; // percentage
    recoveredAppointmentsCount: number;
    estimatedRecoveredValue: number;
    formattedRecoveredValue: string;
  };
  whatsappActivity: {
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    deliveredMessages: number;
    failedMessages: number;
    deliveryRate: number; // percentage
    totalConversations: number;
    openConversations: number;
  };
  aiMetrics: {
    totalInteractions: number;
    totalTokens: number;
    avgLatencyMs: number;
    successRate: number; // percentage
  };
}
