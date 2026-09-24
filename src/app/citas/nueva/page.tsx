import { AppointmentBookingFlow } from "../../../modules/appointments/components";

export const metadata = {
  title: "Nueva Cita | Clinical Cloud",
  description: "Flujo interactivo de agendamiento clínico de citas odontológicas.",
};

export default function NuevaCitaPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppointmentBookingFlow />
    </main>
  );
}
