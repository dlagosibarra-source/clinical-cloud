import { handleInboundWhatsAppMessage } from "../src/modules/ai/orchestrator/whatsapp-ai-orchestrator";
import { ConversationMemoryService } from "../src/modules/ai/services/conversation-memory.service";
import { db } from "../src/shared/database";
import * as schema from "../src/shared/database/schema";
import { eq, or, ilike } from "drizzle-orm";

// Ensure mock dispatch so tests don't fail on Meta Graph API phone whitelisting
process.env.MOCK_WHATSAPP_DISPATCH = "true";

interface TurnResult {
  turnIndex: number;
  userMessage: string;
  aiResponse: string;
  durationMs: number;
}

interface ScenarioReport {
  name: string;
  description: string;
  phone: string;
  contactName: string;
  turns: TurnResult[];
}

function printDivider(char = "═", length = 75) {
  console.log(char.repeat(length));
}

async function runTurn(
  phone: string,
  contactName: string,
  userText: string,
  turnIndex: number
): Promise<TurnResult> {
  console.log(`\n💬 [TURNO ${turnIndex}] ──────────────────────────────────────────`);
  console.log(`🧑 PACIENTE (${contactName}): "${userText}"`);
  console.log(`⏳ Procesando en orquestador...`);

  const startTime = Date.now();
  const result = await handleInboundWhatsAppMessage({
    rawFrom: phone,
    userText,
    contactName,
    messageId: `sim_msg_${Date.now()}_${turnIndex}`,
  });
  const durationMs = Date.now() - startTime;

  const aiText = result.replyText || (result.error ? `[ERROR]: ${result.error}` : "[SIN RESPUESTA]");

  console.log(`🤖 ASISTENTE IA (${durationMs}ms):\n${aiText}`);
  return {
    turnIndex,
    userMessage: userText,
    aiResponse: aiText,
    durationMs,
  };
}

async function cleanupScenarioData(phone: string) {
  // Clear conversation memory
  ConversationMemoryService.clearHistory(phone);

  // Clean appointments and patients created by this phone
  const cleanPhone = phone.replace(/\D/g, "");
  const foundPatients = await db
    .select()
    .from(schema.patients)
    .where(
      or(
        ilike(schema.patients.phone, `%${cleanPhone.slice(-10)}%`),
        ilike(schema.patients.phone, `%${cleanPhone}%`)
      )
    );

  for (const p of foundPatients) {
    await db
      .delete(schema.appointments)
      .where(eq(schema.appointments.patientId, p.patientId));
    await db.delete(schema.patients).where(eq(schema.patients.patientId, p.patientId));
  }
}

async function runSimulations() {
  printDivider();
  console.log("   CLINICAL CLOUD - AGENTIC TESTING & STRESS SIMULATION SUITE");
  console.log("   Evaluating WhatsApp Orchestrator, MCP Engine, and System Prompt");
  printDivider();

  const reports: ScenarioReport[] = [];

  // ============================================================================
  // ESCENARIO A: El Paciente Caótico/Ansioso
  // ============================================================================
  const phoneA = "+526699110001";
  const contactA = "Carlos Pérez";
  await cleanupScenarioData(phoneA);

  console.log("\n");
  printDivider("━");
  console.log("🔥 ESCENARIO A: EL PACIENTE CAÓTICO / ANSIOSO");
  console.log("Objetivo: Cambios de horario repentinos, reprogramación y agendamiento a nombre de un tercero (esposa).");
  printDivider("━");

  const reportA: ScenarioReport = {
    name: "Escenario A: Paciente Caótico/Ansioso",
    description: "Pide cita hoy mismo, cambia a viernes, y luego cambia el titular de la cita a su esposa María.",
    phone: phoneA,
    contactName: contactA,
    turns: [],
  };

  reportA.turns.push(
    await runTurn(phoneA, contactA, "Hola, quiero una cita hoy mismo, me duele mucho.", 1)
  );

  reportA.turns.push(
    await runTurn(phoneA, contactA, "Ah no, espera, hoy no puedo. ¿Tienes para el viernes?", 2)
  );

  reportA.turns.push(
    await runTurn(phoneA, contactA, "Mejor agéndalo a nombre de mi esposa María.", 3)
  );

  reports.push(reportA);

  // ============================================================================
  // ESCENARIO B: Urgencia Clínica Fuera de Horario
  // ============================================================================
  const phoneB = "+526699110002";
  const contactB = "Valeria Ramos";
  await cleanupScenarioData(phoneB);

  console.log("\n");
  printDivider("━");
  console.log("🚨 ESCENARIO B: URGENCIA CLÍNICA / TRAUMA DENTAL");
  console.log("Objetivo: Evaluar triaje clínico, empatía, detección de urgencias activas y protocolos de primeros auxilios.");
  printDivider("━");

  const reportB: ScenarioReport = {
    name: "Escenario B: Urgencia Clínica Fuera de Horario / Trauma",
    description: "Caída con fractura de diente frontal y sangrado activo pidiendo urgencias.",
    phone: phoneB,
    contactName: contactB,
    turns: [],
  };

  reportB.turns.push(
    await runTurn(
      phoneB,
      contactB,
      "Ayuda, me acabo de caer y se me rompió un diente frontal, está sangrando mucho. ¿Tienen urgencias?",
      1
    )
  );

  reports.push(reportB);

  // ============================================================================
  // ESCENARIO C: Cotización Múltiple y Lógica de Negocio
  // ============================================================================
  const phoneC = "+526699110003";
  const contactC = "Jorge Domínguez";
  await cleanupScenarioData(phoneC);

  console.log("\n");
  printDivider("━");
  console.log("💰 ESCENARIO C: COTIZACIÓN MÚLTIPLE Y LÓGICA DE NEGOCIO");
  console.log("Objetivo: Consulta de 3 tratamientos en un solo mensaje y verificación de regla de Valoración Previa.");
  printDivider("━");

  const reportC: ScenarioReport = {
    name: "Escenario C: Cotización Múltiple",
    description: "Pregunta precios de resinas, blanqueamiento y extracción muela del juicio, y si todo cabe en una cita.",
    phone: phoneC,
    contactName: contactC,
    turns: [],
  };

  reportC.turns.push(
    await runTurn(
      phoneC,
      contactC,
      "¿Cuánto sale ponerse resinas, hacer un blanqueamiento y una extracción de muela del juicio? ¿Todo se puede hacer en una cita?",
      1
    )
  );

  reports.push(reportC);

  // ============================================================================
  // DIAGNÓSTICO PRELIMINAR DE BASE DE DATOS
  // ============================================================================
  printDivider("═");
  console.log("📊 AUDITORÍA DE REGISTROS CREADOS EN BASE DE DATOS TRAS SIMULACIÓN:");
  printDivider("─");

  for (const rep of reports) {
    const cleanP = rep.phone.replace(/\D/g, "");
    const patients = await db
      .select()
      .from(schema.patients)
      .where(
        or(
          ilike(schema.patients.phone, `%${cleanP.slice(-10)}%`),
          ilike(schema.patients.phone, `%${cleanP}%`)
        )
      );

    console.log(`\n🔍 Teléfono: ${rep.phone} (${rep.contactName}):`);
    if (patients.length === 0) {
      console.log(`   - Pacientes registrados en DB: 0`);
    } else {
      for (const p of patients) {
        console.log(`   - Paciente: ${p.firstName} ${p.lastName} (ID: ${p.patientId})`);
        const apts = await db
          .select()
          .from(schema.appointments)
          .where(eq(schema.appointments.patientId, p.patientId));
        console.log(`     Citas generadas (${apts.length}):`);
        for (const a of apts) {
          console.log(`     * ID: ${a.appointmentId.slice(0, 8)} | Inicio: ${a.startAt.toISOString()} | Status: ${a.status} | Notas: "${a.notes?.replace(/\n/g, ' ')}"`);
        }
      }
    }
  }

  // Final cleanup of simulation data
  await cleanupScenarioData(phoneA);
  await cleanupScenarioData(phoneB);
  await cleanupScenarioData(phoneC);
  console.log("\n🧹 Limpieza de datos de simulación finalizada con éxito.");
  printDivider("═");
}

runSimulations().catch((err) => {
  console.error("Simulation suite encountered an error:", err);
  process.exit(1);
});
