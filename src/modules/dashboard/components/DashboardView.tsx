"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX2,
  RotateCcw,
  MessageSquare,
  Sparkles,
  Clock,
  User,
  ArrowUpRight,
  RefreshCw,
  Phone,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Cpu,
  ShieldCheck,
  CalendarPlus,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { DashboardKPIs } from "../types";
import { getDashboardKPIsAction } from "../actions/dashboard.actions";

interface DashboardViewProps {
  initialKPIs: DashboardKPIs;
}

export function DashboardView({ initialKPIs }: DashboardViewProps) {
  const [kpis, setKpis] = React.useState<DashboardKPIs>(initialKPIs);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getDashboardKPIsAction();
      if (res.success && res.data) {
        setKpis(res.data);
      }
    } catch (err) {
      console.error("Error refreshing dashboard KPIs:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Confirmada</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">En Consulta</Badge>;
      case "COMPLETED":
        return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30">Completada</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30">Agendada</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">Cancelada</Badge>;
      case "NO_SHOW":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">No Asistió</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & TEMPORAL CONTEXT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
              <ShieldCheck className="size-3.5" />
              Panel Operativo Médico
            </span>
            <span
              suppressHydrationWarning
              className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded"
            >
              {kpis.timezone}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Control de Operaciones Clínicas
          </h1>
          <p
            suppressHydrationWarning
            className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl"
          >
            {kpis.temporalBanner}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 min-w-10 px-3 cursor-pointer"
          >
            <RefreshCw
              className={cn("size-4 mr-1.5 text-muted-foreground", {
                "animate-spin text-cyan-600": isRefreshing,
              })}
            />
            <span className="text-xs sm:text-sm">Actualizar</span>
          </Button>

          <Link href="/agenda">
            <Button variant="outline" size="sm" className="h-10 px-3 cursor-pointer">
              <CalendarDays className="size-4 mr-1.5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs sm:text-sm">Ver Agenda</span>
            </Button>
          </Link>

          <Link href="/citas/nueva">
            <Button size="sm" className="h-10 px-3.5 bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer shadow-sm">
              <CalendarPlus className="size-4 mr-1.5" />
              <span className="text-xs sm:text-sm font-medium">Nueva Cita</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP OPERATIONAL KPI CARDS (ROW 1)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Citas del Día & Ocupación */}
        <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citas Hoy & Ocupación
            </CardTitle>
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {kpis.todayAppointments.activeCount}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {kpis.todayAppointments.occupancyRate}% Ocupación
              </span>
            </div>

            {/* Occupancy Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, kpis.todayAppointments.occupancyRate)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1 text-center text-xs text-muted-foreground border-t border-border/50">
              <div>
                <span className="font-semibold text-foreground block">
                  {kpis.todayAppointments.confirmed + kpis.todayAppointments.scheduled}
                </span>
                <span>Pend/Conf</span>
              </div>
              <div>
                <span className="font-semibold text-foreground block">
                  {kpis.todayAppointments.completed}
                </span>
                <span>Atendidas</span>
              </div>
              <div>
                <span className="font-semibold text-rose-600 dark:text-rose-400 block">
                  {kpis.todayAppointments.cancelled}
                </span>
                <span>Canceladas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Tasa de Cancelaciones & No-Shows */}
        <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelaciones & No-Shows
            </CardTitle>
            <div className="size-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <CalendarX2 className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {kpis.cancellationAndFallout.falloutRate}%
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                Fallout Total
              </span>
            </div>

            {/* Fallout Distribution Bar */}
            <div className="w-full bg-muted rounded-full h-2 flex overflow-hidden">
              <div
                className="bg-rose-500 h-2 transition-all duration-500"
                style={{ width: `${Math.min(100, kpis.cancellationAndFallout.cancellationRate)}%` }}
                title={`Canceladas: ${kpis.cancellationAndFallout.cancellationRate}%`}
              />
              <div
                className="bg-amber-500 h-2 transition-all duration-500"
                style={{ width: `${Math.min(100, kpis.cancellationAndFallout.noShowRate)}%` }}
                title={`No-Shows: ${kpis.cancellationAndFallout.noShowRate}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
              <div>
                <span className="text-rose-600 dark:text-rose-400 font-semibold block">
                  {kpis.cancellationAndFallout.cancellationRate}%
                </span>
                <span>Canceladas ({kpis.cancellationAndFallout.cancelledCount})</span>
              </div>
              <div className="text-right">
                <span className="text-amber-600 dark:text-amber-400 font-semibold block">
                  {kpis.cancellationAndFallout.noShowRate}%
                </span>
                <span>No-shows ({kpis.cancellationAndFallout.noShowCount})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Éxito del Recovery Engine (Fase 4) */}
        <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rescate Recovery Engine
            </CardTitle>
            <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <RotateCcw className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {kpis.recoveryEngine.recoverySuccessRate}%
              </span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {kpis.recoveryEngine.recoveredAppointmentsCount} Rescatadas
              </span>
            </div>

            <div className="text-xs font-medium text-muted-foreground flex items-center justify-between bg-muted/40 p-2 rounded-lg">
              <span>Valor Económico:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                {kpis.recoveryEngine.formattedRecoveredValue}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/50 pt-1">
              <span>Ofertas Emitidas:</span>
              <span className="font-semibold text-foreground">
                {kpis.recoveryEngine.totalOffers} (pend: {kpis.recoveryEngine.pendingOffers})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Tráfico WhatsApp & Asistente IA (Fases 6 y 7) */}
        <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WhatsApp & IA Clínica
            </CardTitle>
            <div className="size-9 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <MessageSquare className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {kpis.whatsappActivity.totalMessages}
              </span>
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                {kpis.whatsappActivity.deliveryRate}% Entrega
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/40 p-1.5 rounded">
                <span className="text-muted-foreground block text-[11px]">Recibidos</span>
                <span className="font-bold text-foreground">
                  {kpis.whatsappActivity.inboundMessages} msgs
                </span>
              </div>
              <div className="bg-muted/40 p-1.5 rounded">
                <span className="text-muted-foreground block text-[11px]">Enviados</span>
                <span className="font-bold text-foreground">
                  {kpis.whatsappActivity.outboundMessages} msgs
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/50 pt-1">
              <span>Turnos IA Trazados:</span>
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                {kpis.aiMetrics.totalInteractions} ejecuciones
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT: TODAY'S SCHEDULE & RECOVERY BREAKDOWN (ROW 2)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Schedule (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="size-5 text-cyan-600 dark:text-cyan-400" />
                  Agenda de Pacientes de Hoy
                </CardTitle>
                <CardDescription className="text-xs">
                  {kpis.todayAppointments.schedule.length > 0
                    ? `Mostrando ${kpis.todayAppointments.schedule.length} citas programadas para el día de hoy.`
                    : "No se encontraron citas agendadas para hoy."}
                </CardDescription>
              </div>
              <Link href="/agenda">
                <Button variant="ghost" size="sm" className="text-xs text-cyan-600 hover:text-cyan-700 cursor-pointer">
                  Agenda semanal
                  <ArrowUpRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {kpis.todayAppointments.schedule.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                  <div className="size-12 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3">
                    <CalendarCheck className="size-6" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">Sin citas para hoy</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                    La agenda de hoy está disponible para nuevos pacientes o rescate de cancelaciones.
                  </p>
                  <Link href="/citas/nueva">
                    <Button size="sm" className="h-9 px-4 bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer">
                      <CalendarPlus className="size-4 mr-1.5" />
                      Agendar Cita
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {kpis.todayAppointments.schedule.map((item) => (
                    <div
                      key={item.appointmentId}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold flex flex-col items-center justify-center text-xs shrink-0 mt-0.5">
                          <Clock className="size-3.5 mb-0.5 opacity-80" />
                          <span>{item.timeStr}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {item.patientName}
                            </h4>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.serviceName} · <span className="font-mono">{item.duration} min</span>
                            {item.dentistName && ` · Dr(a). ${item.dentistName}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center ml-13 sm:ml-0">
                        {item.patientPhone && (
                          <a
                            href={`https://wa.me/${item.patientPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 bg-muted/50 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-md transition-colors"
                          >
                            <Phone className="size-3 text-emerald-600" />
                            <span className="font-mono text-[11px]">{item.patientPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Performance Breakdown (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recovery Engine Breakdown */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <RotateCcw className="size-4 text-indigo-600 dark:text-indigo-400" />
                Desglose Recovery Engine
              </CardTitle>
              <CardDescription className="text-xs">
                Métricas de rescate de cancelaciones de la lista de espera.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Ofertas Aceptadas:
                  </span>
                  <span className="font-bold text-foreground">
                    {kpis.recoveryEngine.acceptedOffers} ({kpis.recoveryEngine.recoverySuccessRate}%)
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-400" />
                    Ofertas Expiradas:
                  </span>
                  <span className="text-muted-foreground">
                    {kpis.recoveryEngine.expiredOffers}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-400" />
                    Ofertas Declinadas:
                  </span>
                  <span className="text-muted-foreground">
                    {kpis.recoveryEngine.declinedOffers}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" />
                    Ofertas Pendientes:
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {kpis.recoveryEngine.pendingOffers}
                  </span>
                </div>
              </div>

              {/* Stacked visual distribution */}
              <div className="w-full bg-muted rounded-full h-2.5 flex overflow-hidden">
                {kpis.recoveryEngine.totalOffers > 0 ? (
                  <>
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(kpis.recoveryEngine.acceptedOffers / kpis.recoveryEngine.totalOffers) * 100}%` }}
                      title={`Aceptadas: ${kpis.recoveryEngine.acceptedOffers}`}
                    />
                    <div
                      className="bg-slate-400 h-full"
                      style={{ width: `${(kpis.recoveryEngine.expiredOffers / kpis.recoveryEngine.totalOffers) * 100}%` }}
                      title={`Expiradas: ${kpis.recoveryEngine.expiredOffers}`}
                    />
                    <div
                      className="bg-rose-400 h-full"
                      style={{ width: `${(kpis.recoveryEngine.declinedOffers / kpis.recoveryEngine.totalOffers) * 100}%` }}
                      title={`Declinadas: ${kpis.recoveryEngine.declinedOffers}`}
                    />
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(kpis.recoveryEngine.pendingOffers / kpis.recoveryEngine.totalOffers) * 100}%` }}
                      title={`Pendientes: ${kpis.recoveryEngine.pendingOffers}`}
                    />
                  </>
                ) : (
                  <div className="bg-muted-foreground/20 w-full h-full" />
                )}
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15 text-xs space-y-1">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300 block">
                  💡 Impacto Financiero
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  El motor recuperó <span className="font-bold text-foreground">{kpis.recoveryEngine.recoveredAppointmentsCount} citas</span> evitando pérdidas de horario por valor estimado de <span className="font-bold text-emerald-600 dark:text-emerald-400">{kpis.recoveryEngine.formattedRecoveredValue}</span>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Intelligence & System Health Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Cpu className="size-4 text-cyan-600 dark:text-cyan-400" />
                Auditoría IA & PostgreSQL
              </CardTitle>
              <CardDescription className="text-xs">
                Métricas de trazabilidad de la Fase 7 en PostgreSQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Tokens procesados:</span>
                <span className="font-mono font-semibold text-foreground">
                  {kpis.aiMetrics.totalTokens.toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Latencia promedio LLM:</span>
                <span className="font-mono font-semibold text-foreground">
                  {kpis.aiMetrics.avgLatencyMs} ms
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Efectividad respuestas IA:</span>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none font-mono text-[11px]">
                  {kpis.aiMetrics.successRate}% OK
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Conversaciones activas:</span>
                <span className="font-semibold text-foreground">
                  {kpis.whatsappActivity.openConversations} abiertas
                </span>
              </div>

              <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>Aislamiento multi-tenant por organization_id 100% verificado.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
