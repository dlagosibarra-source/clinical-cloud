import { AgendaView } from "@/modules/agenda/components/AgendaView";
import { getAgendaAppointmentsAction } from "@/modules/appointments/actions/appointment.actions";
import { getClinicTodayDateStr } from "@/shared/utils/date-time";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda Clínica | Clinical Cloud",
  description: "Visualización y gestión de la agenda diaria y semanal de turnos odontológicos.",
};

interface AgendaPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const { date } = await searchParams;
  const targetDate = date || getClinicTodayDateStr("America/Mazatlan");

  const res = await getAgendaAppointmentsAction(targetDate);

  const initialAppointments = res.success && res.data ? res.data : [];
  const initialDentists = res.dentists && res.dentists.length > 0 ? res.dentists : undefined;
  const initialLocations = res.locations && res.locations.length > 0 ? res.locations : undefined;

  return (
    <main className="min-h-screen bg-background">
      <AgendaView
        initialDate={targetDate}
        initialAppointments={initialAppointments}
        initialDentists={initialDentists}
        initialLocations={initialLocations}
      />
    </main>
  );
}
