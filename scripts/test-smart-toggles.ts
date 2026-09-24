import { db } from "../src/shared/database";
import * as schema from "../src/shared/database/schema";
import { eq } from "drizzle-orm";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  getServicesListAction,
} from "../src/modules/services/actions/service.actions";
import { executeGetTreatmentPrices } from "../src/modules/ai/mcp/clinical-mcp-engine";

async function runSmartTogglesTests() {
  console.log("==================================================================");
  console.log("  TEST SUITE: SMART TOGGLES (AI BEHAVIOR CONTROL IN SERVICES)");
  console.log("==================================================================");

  // TEST 1: Create a Service with Smart Toggles Enabled (Variable Price + Requires Assessment)
  console.log("\n[TEST 1] Create Service with Smart Toggles Enabled");
  const testServiceName = `Ortodoncia Invisible Test ${Date.now()}`;
  const createRes = await createServiceAction({
    name: testServiceName,
    description: "Alineadores transparentes de última generación",
    durationMinutes: 60,
    price: 18000,
    currency: "MXN",
    isVariablePrice: true,
    requiresAssessment: true,
    status: "ACTIVE",
  });

  console.log("Create result:", createRes.success, createRes.data?.serviceId);
  if (!createRes.success || !createRes.data) {
    throw new Error(`Failed to create service with smart toggles: ${createRes.error}`);
  }

  const createdId = createRes.data.serviceId;

  // TEST 2: Verify columns in PostgreSQL directly
  console.log("\n[TEST 2] Verify Database Column Persistence in PostgreSQL");
  const [dbRecord] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.serviceId, createdId));

  if (!dbRecord) {
    throw new Error("Created service not found in PostgreSQL!");
  }

  console.log("DB isVariablePrice:", dbRecord.isVariablePrice, "Expected: true");
  console.log("DB requiresAssessment:", dbRecord.requiresAssessment, "Expected: true");

  if (dbRecord.isVariablePrice !== true || dbRecord.requiresAssessment !== true) {
    throw new Error("Smart toggles were not persisted correctly in database!");
  }
  console.log("✅ TEST 2 PASSED: is_variable_price and requires_assessment persisted in DB.");

  // TEST 3: Update Service toggles
  console.log("\n[TEST 3] Update Service Toggles via updateServiceAction");
  const updateRes = await updateServiceAction(createdId, {
    isVariablePrice: false,
    requiresAssessment: true,
  });

  if (!updateRes.success || !updateRes.data) {
    throw new Error(`Failed to update service toggles: ${updateRes.error}`);
  }

  const [dbUpdated] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.serviceId, createdId));

  if (!dbUpdated || dbUpdated.isVariablePrice !== false || dbUpdated.requiresAssessment !== true) {
    throw new Error("Updated toggles mismatch in database!");
  }
  console.log("✅ TEST 3 PASSED: Update action correctly modifies toggle values.");

  // Re-enable isVariablePrice for testing MCP formatting
  await updateServiceAction(createdId, {
    isVariablePrice: true,
    requiresAssessment: true,
  });

  // TEST 4: MCP Tool executeGetTreatmentPrices Formatting & AI Rules
  console.log("\n[TEST 4] Verify MCP Tool executeGetTreatmentPrices AI Rule Translation");
  const mcpRes = await executeGetTreatmentPrices({ query: testServiceName });

  console.log("MCP response success:", mcpRes.success);
  console.log("MCP formatted list output:\n" + mcpRes.formattedList);

  if (!mcpRes.formattedList.includes("Precio estimado desde: $18000.00 MXN")) {
    throw new Error("MCP formattedList did not format variable price as 'Precio estimado desde'!");
  }

  if (
    !mcpRes.formattedList.includes(
      "[REGLA ESTRICTA PARA IA: Este tratamiento requiere valoración previa obligatoria. No agendes el tratamiento directo, persuade al paciente para agendar la 'Valoración General y Diagnóstico' primero]."
    )
  ) {
    throw new Error("MCP formattedList missing strict assessment rule!");
  }

  // Also test standard fixed price without assessment
  const stdPrices = await executeGetTreatmentPrices({ query: "limpieza" });
  console.log("\nStandard treatment MCP output:\n" + stdPrices.formattedList);
  if (!stdPrices.formattedList.includes("[Puede agendarse directamente]")) {
    throw new Error("Standard service without assessment should be marked '[Puede agendarse directamente]'!");
  }
  console.log("✅ TEST 4 PASSED: executeGetTreatmentPrices accurately translates smart toggles into strict AI directives.");

  // TEST 5: Clean up test record
  console.log("\n[TEST 5] Clean up test service");
  await db.delete(schema.services).where(eq(schema.services.serviceId, createdId));
  console.log("✅ TEST 5 PASSED: Cleaned up test record.");

  console.log("\n==================================================================");
  console.log("  ALL SMART TOGGLES TESTS PASSED WITH 100% SUCCESS! ");
  console.log("==================================================================");
  process.exit(0);
}

runSmartTogglesTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
