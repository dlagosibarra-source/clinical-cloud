import { PatientsDataGrid } from "@/modules/patients/components/PatientsDataGrid";
import { getPatientsListAction } from "@/modules/patients/actions/patient.actions";
import { MOCK_PATIENTS_LIST } from "@/modules/patients/mock-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directorio de Pacientes | Clinical Cloud",
  description: "Gestión centralizada de expedientes, contacto e historial clínico de pacientes.",
};

interface PacientesPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function PacientesPage({ searchParams }: PacientesPageProps) {
  const { q, page } = await searchParams;
  const pageNum = page ? parseInt(page, 10) : 1;

  const res = await getPatientsListAction(q || "", pageNum, 20);

  // Fallback to mock data if no database records yet for demo preview
  const patients =
    res.success && res.data && res.data.length > 0
      ? res.data
      : MOCK_PATIENTS_LIST;

  const pagination = res.pagination || {
    page: 1,
    limit: 20,
    total: patients.length,
    totalPages: Math.ceil(patients.length / 20) || 1,
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Directorio de Pacientes
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Administra expedientes clínicos, datos de contacto e historial de consultas.
            </p>
          </div>
        </div>

        {/* Data Grid Component */}
        <PatientsDataGrid
          initialPatients={patients}
          initialPagination={pagination}
          onSearch={async (query, p) => {
            "use server";
            const searchRes = await getPatientsListAction(query, p, 20);
            return {
              data: searchRes.success && searchRes.data ? searchRes.data : [],
              pagination: searchRes.pagination || { page: p, limit: 20, total: 0, totalPages: 1 },
            };
          }}
        />
      </div>
    </main>
  );
}
