import { PatientProfile } from "@/modules/patients/components/PatientProfile";
import { getPatientDetailsAction } from "@/modules/patients/actions/patient.actions";
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
  const patient = res.success && res.data ? res.data : null;

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

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <PatientProfile initialPatient={res.data} />
    </main>
  );
}
