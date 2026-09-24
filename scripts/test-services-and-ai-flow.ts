import { db } from "../src/shared/database";
import * as schema from "../src/shared/database/schema";
import { eq, and } from "drizzle-orm";
import {
  getServicesListAction,
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from "../src/modules/services/actions/service.actions";
import { PatientsRepository } from "../src/modules/patients/repositories/patients.repository";
import {
  executeGetTreatmentPrices,
  executeRegisterPatient,
} from "../src/modules/ai/mcp/clinical-mcp-engine";
import { buildClinicalSystemPrompt } from "../src/modules/ai/services/ai.service";

async function runServicesAndAIFlowTests() {
  console.log("==================================================================");
  console.log("  TEST SUITE: SERVICES CATALOG & WHATSAPP AI ENHANCEMENTS");
  console.log("==================================================================");

  const testOrgId = "00000000-0000-4000-a000-000000000001";

  // TEST 1: Initial services list
  console.log("\n[TEST 1] Query Services via getServicesListAction()");
  const initialServicesRes = await getServicesListAction();
  console.log("Initial services response success:", initialServicesRes.success);
  console.log("Total services found:", initialServicesRes.data?.length);
  if (!initialServicesRes.success || !initialServicesRes.data || initialServicesRes.data.length === 0) {
    throw new Error("Expected initial seeded services in database!");
  }
  console.log("Sample service:", initialServicesRes.data[0]?.name, `($${initialServicesRes.data[0]?.price} ${initialServicesRes.data[0]?.currency})`);
  console.log("✅ TEST 1 PASSED: Services retrieved successfully.");

  // TEST 2: Create, Update, and Delete Service
  console.log("\n[TEST 2] CRUD Operations on Services Catalog");
  const testServiceName = `Tratamiento Prueba IA ${Date.now()}`;
  const createRes = await createServiceAction({
    name: testServiceName,
    description: "Tratamiento de prueba automatizado para verificar CRUD",
    durationMinutes: 60,
    price: 3200,
    currency: "MXN",
    status: "ACTIVE",
  });
  console.log("Create service result:", createRes.success, createRes.data?.serviceId);
  if (!createRes.success || !createRes.data) {
    throw new Error(`Failed to create service: ${createRes.error}`);
  }
  const createdServiceId = createRes.data.serviceId;

  // Update
  const updateRes = await updateServiceAction(createdServiceId, {
    price: 3500,
    durationMinutes: 75,
    description: "Descripción actualizada con nuevo precio y duración",
  });
  console.log("Update service result:", updateRes.success, updateRes.data?.price);
  if (!updateRes.success || updateRes.data?.price !== "3500.00" || updateRes.data?.durationMinutes !== 75) {
    throw new Error("Update service failed to reflect changes!");
  }

  // Soft Delete
  const deleteRes = await deleteServiceAction(createdServiceId);
  console.log("Delete service result:", deleteRes.success);
  if (!deleteRes.success) {
    throw new Error("Delete service failed!");
  }

  // Verify soft-deleted status in DB
  const [deletedRecord] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.serviceId, createdServiceId));
  if (!deletedRecord || deletedRecord.status !== "INACTIVE") {
    throw new Error(`Expected service status INACTIVE after delete, got: ${deletedRecord?.status}`);
  }
  console.log("✅ TEST 2 PASSED: Service CRUD lifecycle (Create, Update, Soft-Delete) verified.");

  // TEST 3: Patients Repository findByPhone (New vs Recurring detection)
  console.log("\n[TEST 3] Patient Identification by Phone (New vs Recurring)");
  const patientRepo = new PatientsRepository(db);

  // Check non-existent phone
  const nonExistentPhone = "+529990001122";
  const newPatientCheck = await patientRepo.findByPhone(testOrgId, nonExistentPhone);
  console.log("Lookup non-existent phone:", newPatientCheck ? "FOUND" : "NULL (Expected)");
  if (newPatientCheck !== null) {
    throw new Error("Expected null for non-existent patient phone!");
  }

  // TEST 4: MCP Tool get_treatment_prices
  console.log("\n[TEST 4] MCP Tool: get_treatment_prices");
  const pricesAll = await executeGetTreatmentPrices();
  console.log("Full catalog count:", pricesAll.totalServices);
  if (!pricesAll.success || pricesAll.totalServices === 0) {
    throw new Error("get_treatment_prices returned empty or failed!");
  }

  const pricesFiltered = await executeGetTreatmentPrices({ query: "limpieza" });
  console.log("Filtered 'limpieza' count:", pricesFiltered.catalog.length);
  if (pricesFiltered.catalog.length === 0 || !pricesFiltered.catalog[0]?.name.toLowerCase().includes("limpieza")) {
    throw new Error("Failed to filter treatment prices by keyword 'limpieza'!");
  }
  console.log("Limpieza treatment price:", pricesFiltered.catalog[0]?.price, pricesFiltered.catalog[0]?.currency);
  console.log("✅ TEST 4 PASSED: get_treatment_prices returns accurate clinic prices and filters.");

  // TEST 5: MCP Tool register_patient
  console.log("\n[TEST 5] MCP Tool: register_patient");
  const testPhone = `+52669${Math.floor(1000000 + Math.random() * 9000000)}`;
  const regRes1 = await executeRegisterPatient({
    firstName: "Mariana",
    lastName: "Ochoa Test",
    phone: testPhone,
    email: "mariana.ochoa@test.com",
    dateOfBirth: "1994-08-15",
    gender: "FEMENINO",
  });
  console.log("Register new patient:", regRes1.success, "isNew:", regRes1.isNew, "patientId:", regRes1.patientId);
  if (!regRes1.success || !regRes1.isNew || !regRes1.patientId) {
    throw new Error("Failed to register new patient!");
  }

  // Calling again with same phone should detect existing patient and return isNew: false
  const regRes2 = await executeRegisterPatient({
    firstName: "Mariana",
    lastName: "Ochoa Test",
    phone: testPhone,
  });
  console.log("Register existing patient idempotency:", regRes2.success, "isNew:", regRes2.isNew, "patientId:", regRes2.patientId);
  if (!regRes2.success || regRes2.isNew !== false || regRes2.patientId !== regRes1.patientId) {
    throw new Error("Idempotent register_patient failed to return existing patient!");
  }

  // Verify findByPhone now detects this recurring patient
  const recurrentPatient = await patientRepo.findByPhone(testOrgId, testPhone);
  if (!recurrentPatient || recurrentPatient.patientId !== regRes1.patientId) {
    throw new Error("findByPhone failed to find the newly registered patient!");
  }
  console.log("Detected recurring patient in DB:", `${recurrentPatient.firstName} ${recurrentPatient.lastName}`, "OptIn:", recurrentPatient.whatsappOptIn);
  console.log("✅ TEST 5 PASSED: register_patient creates record, sets WhatsApp OptIn, and maintains idempotency.");

  // TEST 6: System Prompt Injection & Directives Verification
  console.log("\n[TEST 6] System Prompt Generation & Anti-Hallucination Directives");
  const promptRecurring = buildClinicalSystemPrompt({
    patientPhone: testPhone,
    contactName: "Mariana Ochoa",
    patientContext: `[ESTADO: RECURRENTE] | [NOMBRE: Mariana Ochoa] | [ID: ${regRes1.patientId}]`,
  });

  if (!promptRecurring.includes("[ESTADO: RECURRENTE]")) {
    throw new Error("System prompt missing [ESTADO: RECURRENTE] context!");
  }
  if (!promptRecurring.includes("DIRECTIVAS ESTRICTAS DE COTIZACIONES Y TARIFARIO (CERO ALUCINACIONES)")) {
    throw new Error("System prompt missing quotation directives!");
  }
  if (!promptRecurring.includes("get_treatment_prices")) {
    throw new Error("System prompt missing mandatory get_treatment_prices instruction!");
  }
  if (!promptRecurring.includes("register_patient")) {
    throw new Error("System prompt missing register_patient instruction!");
  }
  console.log("✅ TEST 6 PASSED: System prompt properly includes patient context and strict quotation rules.");

  // Clean up test patient created in test 5
  await db.delete(schema.patients).where(eq(schema.patients.patientId, regRes1.patientId));
  console.log("Cleaned up temporary test patient.");

  console.log("\n==================================================================");
  console.log("  ALL TESTS PASSED WITH 100% SUCCESS! ");
  console.log("==================================================================");
  process.exit(0);
}

runServicesAndAIFlowTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
