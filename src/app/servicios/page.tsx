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
      <ServicesDataGrid initialServices={services} />
    </main>
  );
}
