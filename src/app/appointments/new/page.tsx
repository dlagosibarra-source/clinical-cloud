import { AppointmentBookingFlow } from "../../../modules/appointments/components";

export const metadata = {
  title: "Agendar Cita | Clinical Cloud",
  description: "Flujo de agendamiento clínico de citas odontológicas con verificación en tiempo real.",
};

export default function NewAppointmentPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppointmentBookingFlow />
    </main>
  );
}
