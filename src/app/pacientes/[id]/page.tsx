import { PatientProfile } from "@/modules/patients/components/PatientProfile";
import { getPatientDetailsAction } from "@/modules/patients/actions/patient.actions";
import { MOCK_PATIENT_PROFILES } from "@/modules/patients/mock-data";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PatientProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PatientProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getPatientDetailsAction(id);
  const patient = res.success && res.data ? res.data : MOCK_PATIENT_PROFILES[id];

  if (patient) {
    return {
      title: `${patient.firstName} ${patient.lastName} — Perfil Clínico | Clinical Cloud`,
      description: `Expediente clínico e historial de citas de ${patient.firstName} ${patient.lastName}.`,
    };
  }

  return {
    title: "Perfil del Paciente | Clinical Cloud",
    description: "Detalle y expediente clínico del paciente.",
  };
}

export default async function PatientProfilePage({
  params,
}: PatientProfilePageProps) {
  const { id } = await params;

  const res = await getPatientDetailsAction(id);

  const patient =
    res.success && res.data
      ? res.data
      : MOCK_PATIENT_PROFILES[id] || {
          patientId: id,
          firstName: "Paciente",
          lastName: "Demo",
          phone: "+52 55 0000 0000",
          email: "paciente@demo.clinicalcloud.dev",
          dateOfBirth: "1990-01-01",
          gender: "F",
          whatsappOptIn: true,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          stats: {
            totalAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
          },
          history: [],
        };

  return (
    <main className="min-h-screen bg-background">
      <PatientProfile initialPatient={patient} />
    </main>
  );
}
