import { ServicesDataGrid } from "@/modules/services/components/ServicesDataGrid";
import { getServicesListAction } from "@/modules/services/actions/service.actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Servicios y Tarifario | Clinical Cloud",
  description: "Administración del catálogo de tratamientos, precios, duración y estado activo para la clínica y el asistente de IA.",
};

interface ServiciosPageProps {
  searchParams: Promise<{ q?: string; status?: "ACTIVE" | "INACTIVE" | "ALL" }>;
}

export default async function ServiciosPage({ searchParams }: ServiciosPageProps) {
  const { q, status } = await searchParams;
  const statusFilter = status === "ACTIVE" || status === "INACTIVE" ? status : undefined;

  const res = await getServicesListAction(q, statusFilter);
  const services = res.success && res.data ? res.data : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Catálogo de Servicios y Tratamientos
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Administra el tarifario oficial de la clínica. Este catálogo alimenta las cotizaciones y citas del Asistente de IA en tiempo real.
            </p>
          </div>
        </div>

        {/* Data Grid Component */}
        <ServicesDataGrid initialServices={services} />
      </div>
    </main>
  );
}
