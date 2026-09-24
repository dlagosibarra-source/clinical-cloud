"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Clock,
  DollarSign,
  Sparkles,
  Edit2,
  Power,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Filter,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { ServiceDialog, type ServiceRecord } from "./ServiceDialog";
import {
  getServicesListAction,
  updateServiceAction,
  deleteServiceAction,
} from "../actions/service.actions";
import { cn } from "cn";

interface ServicesDataGridProps {
  initialServices?: ServiceRecord[];
}

export function ServicesDataGrid({ initialServices = [] }: ServicesDataGridProps) {
  const [services, setServices] = React.useState<ServiceRecord[]>(initialServices);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isLoading, setIsLoading] = React.useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<ServiceRecord | null>(null);

  // Toast feedback
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "warning";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3500);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Fetch / refresh services
  const refreshServices = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getServicesListAction(searchQuery, statusFilter);
      if (res.success && res.data) {
        setServices(res.data as ServiceRecord[]);
      }
    } catch (err) {
      console.error("Error refreshing services:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Search debounce
  React.useEffect(() => {
    const handler = setTimeout(() => {
      refreshServices();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, statusFilter, refreshServices]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (svc: ServiceRecord) => {
    setEditingService(svc);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (svc: ServiceRecord) => {
    const newStatus = svc.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await updateServiceAction(svc.serviceId, { status: newStatus });
      if (res.success && res.data) {
        setServices((prev) =>
          prev.map((s) =>
            s.serviceId === svc.serviceId ? (res.data as ServiceRecord) : s
          )
        );
        setFeedback({
          type: "success",
          message: `Tratamiento "${svc.name}" marcado como ${newStatus === "ACTIVE" ? "Activo" : "Inactivo"}.`,
        });
      } else {
        throw new Error(res.error || "No se pudo actualizar el estado.");
      }
    } catch (err) {
      setFeedback({
        type: "warning",
        message: err instanceof Error ? err.message : "Error al cambiar estado.",
      });
    }
  };

  const handleSaved = (saved: ServiceRecord) => {
    setServices((prev) => {
      const exists = prev.some((s) => s.serviceId === saved.serviceId);
      if (exists) {
        return prev.map((s) => (s.serviceId === saved.serviceId ? saved : s));
      } else {
        return [saved, ...prev];
      }
    });
    setFeedback({
      type: "success",
      message: `Tratamiento "${saved.name}" guardado exitosamente.`,
    });
  };

  // Metrics
  const totalCount = services.length;
  const activeCount = services.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-card border border-border p-3.5 shadow-lg text-xs animate-in slide-in-from-bottom-5 duration-200">
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
          )}
          <span className="font-medium text-foreground">{feedback.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Stethoscope className="size-4" />
            <span>Catálogo Clínico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Servicios y Tarifario
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Administra los tratamientos, precios y duraciones para la agenda y las cotizaciones del Asistente de WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
          >
            <Plus className="size-4" />
            <span>Nuevo Tratamiento</span>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground">Total Tratamientos</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalCount}</span>
            <span className="text-[11px] text-muted-foreground">en catálogo</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground">Tratamientos Activos</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{activeCount}</span>
            <span className="text-[11px] text-muted-foreground">para IA y citas</span>
          </div>
        </div>

        <div className="hidden sm:block rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground">Divisa Oficial</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">MXN</span>
            <span className="text-[11px] text-muted-foreground">Pesos Mexicanos</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-card shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="size-3.5 text-muted-foreground" />
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                statusFilter === "ALL"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                statusFilter === "ACTIVE"
                  ? "bg-card text-emerald-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                statusFilter === "INACTIVE"
                  ? "bg-card text-muted-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Inactivos
            </button>
          </div>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Tratamiento</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Duración</th>
                <th className="py-3.5 px-4">Precio</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Sparkles className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium">No se encontraron tratamientos</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Intenta con otra búsqueda o registra un nuevo tratamiento en el tarifario.
                    </p>
                  </td>
                </tr>
              ) : (
                services.map((svc) => {
                  const isActive = svc.status === "ACTIVE";
                  const priceNum = parseFloat(String(svc.price) || "0");
                  const formattedPrice = `$${priceNum.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${svc.currency}`;

                  return (
                    <tr
                      key={svc.serviceId}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                        <div className="flex items-start gap-2.5">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 shrink-0 mt-0.5">
                            <Sparkles className="size-3.5" />
                          </div>
                          <div>
                            <span className="truncate max-w-[220px] sm:max-w-[300px] block">
                              {svc.name}
                            </span>
                            {/* Smart Toggles Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {svc.requiresAssessment && (
                                <span
                                  title="La IA ofrecerá cita de diagnóstico primero"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                >
                                  <Stethoscope className="size-2.5 shrink-0" />
                                  Requiere Valoración
                                </span>
                              )}
                              {svc.isVariablePrice && (
                                <span
                                  title="Precio cotizado como 'Desde $X' por la IA"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20"
                                >
                                  <TrendingUp className="size-2.5 shrink-0" />
                                  Precio Variable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                        {svc.description || <span className="italic text-muted-foreground/50">Sin descripción</span>}
                      </td>

                      <td className="py-3.5 px-4 text-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-cyan-600" />
                          <span>{svc.durationMinutes} min</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <div className="flex flex-col">
                          <span className="text-emerald-600">
                            {svc.isVariablePrice ? `Desde ${formattedPrice}` : formattedPrice}
                          </span>
                          {svc.isVariablePrice && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              Sujeto a evaluación
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={isActive ? "success" : "secondary"}
                          className="text-[10px] uppercase font-semibold"
                        >
                          {isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(svc)}
                            className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Editar tratamiento"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(svc)}
                            className={cn(
                              "size-8 p-0 transition-colors",
                              isActive
                                ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            )}
                            title={isActive ? "Desactivar de cotizaciones" : "Activar en cotizaciones"}
                          >
                            <Power className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog for Create & Edit */}
      <ServiceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        service={editingService}
        onSaved={handleSaved}
      />
    </div>
  );
}
