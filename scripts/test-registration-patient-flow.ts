import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/shared/database";
import { organizations } from "../src/modules/organizations/types/schema";
import { patients } from "../src/modules/patients/types/schema";
import { createOrganizationAction } from "../src/modules/organizations/actions/organization.actions";
import { PatientService } from "../src/modules/patients/services/patient.service";
import { eq, or } from "drizzle-orm";

async function main() {
  console.log("==========================================================");
  console.log("🧪 TESTING REGISTRATION, MULTI-TENANCY & PATIENT INTEGRITY");
  console.log("==========================================================");

  const testOrg1Id = crypto.randomUUID();
  const testOrg2Id = crypto.randomUUID();
  const sharedEmail = `paciente-${Date.now()}@shared-domain.com`;

  try {
    // ─── TEST 1: Database Synchronization (createOrganizationAction) ───
    console.log("\n[TEST 1] Testing createOrganizationAction (PostgreSQL Drizzle)...");
    const org1Result = await createOrganizationAction({
      organizationId: testOrg1Id,
      name: "Clínica Dental Norte",
    });

    if (!org1Result.success) {
      throw new Error(`Failed to create org 1: ${org1Result.error}`);
    }
    console.log(`✅ Organization 1 created: ID = ${testOrg1Id}, Name = Clínica Dental Norte`);

    // Test Idempotency: re-running with same organizationId should succeed without error
    const org1Idempotent = await createOrganizationAction({
      organizationId: testOrg1Id,
      name: "Clínica Dental Norte",
    });
    if (!org1Idempotent.success) {
      throw new Error("Idempotency check failed for createOrganizationAction");
    }
    console.log("✅ Idempotent registration verified.");

    // Create Org 2
    const org2Result = await createOrganizationAction({
      organizationId: testOrg2Id,
      name: "Clínica Dental Sur",
    });
    if (!org2Result.success) {
      throw new Error(`Failed to create org 2: ${org2Result.error}`);
    }
    console.log(`✅ Organization 2 created: ID = ${testOrg2Id}, Name = Clínica Dental Sur`);

    // ─── TEST 2: Patient Creation & Multi-tenant Composite Unique Email ───
    console.log("\n[TEST 2] Testing Patient Creation with same email across different orgs...");
    const patientService = new PatientService(db);

    const contextOrg1 = {
      user_id: "00000000-0000-4000-a000-000000000002",
      organization_id: testOrg1Id,
      role: "OWNER" as const,
    };

    const contextOrg2 = {
      user_id: "00000000-0000-4000-a000-000000000002",
      organization_id: testOrg2Id,
      role: "OWNER" as const,
    };

    // Patient in Org 1
    const p1 = await patientService.createPatient(contextOrg1, {
      firstName: "Laura",
      lastName: "Morales",
      phone: "+525511223344",
      email: sharedEmail,
      status: "ACTIVE",
      whatsappOptIn: true,
    });

    if (!p1 || p1.organizationId !== testOrg1Id) {
      throw new Error("Patient 1 organization_id mismatch!");
    }
    console.log(`✅ Patient 1 created in Org 1 (${p1.firstName} ${p1.lastName}, email: ${p1.email})`);

    // Patient in Org 2 with SAME email (must succeed because unique constraint is composite per org!)
    const p2 = await patientService.createPatient(contextOrg2, {
      firstName: "Laura",
      lastName: "Morales (Segunda Clínica)",
      phone: "+525599887766",
      email: sharedEmail,
      status: "ACTIVE",
      whatsappOptIn: false,
    });

    if (!p2 || p2.organizationId !== testOrg2Id) {
      throw new Error("Patient 2 organization_id mismatch!");
    }
    console.log(`✅ Patient 2 created in Org 2 with same email: ${p2.email} (Cross-org email allowed!)`);

    // ─── TEST 3: Duplicate Email in SAME Organization must be rejected ───
    console.log("\n[TEST 3] Testing duplicate email rejection within SAME organization...");
    let duplicateRejected = false;
    try {
      await patientService.createPatient(contextOrg1, {
        firstName: "Impostor",
        lastName: "Duplicate",
        phone: "+525500000000",
        email: sharedEmail,
        status: "ACTIVE",
        whatsappOptIn: false,
      });
    } catch (dupError: unknown) {
      const errObj = dupError as { message?: string; cause?: { message?: string; detail?: string; constraint_name?: string } };
      const combined = [
        errObj?.message,
        errObj?.cause?.message,
        errObj?.cause?.detail,
        errObj?.cause?.constraint_name,
      ].filter(Boolean).join(" ").toLowerCase();

      if (combined.includes("uq_patients_org_email") || combined.includes("unique")) {
        duplicateRejected = true;
        console.log(`✅ Duplicate within same org rejected as expected: constraint = ${errObj?.cause?.constraint_name || "uq_patients_org_email"}`);
      } else {
        throw dupError;
      }
    }

    if (!duplicateRejected) {
      throw new Error("Expected duplicate email in same organization to be rejected by uq_patients_org_email!");
    }

    console.log("\n==========================================================");
    console.log("🎉 ALL MULTI-TENANT & PATIENT INTEGRITY TESTS PASSED 100%!");
    console.log("==========================================================");
  } finally {
    // Cleanup test data
    console.log("\n🧹 Cleaning up test organizations and patients...");
    await db.delete(patients).where(or(eq(patients.organizationId, testOrg1Id), eq(patients.organizationId, testOrg2Id)));
    await db.delete(organizations).where(or(eq(organizations.organizationId, testOrg1Id), eq(organizations.organizationId, testOrg2Id)));
    console.log("✅ Cleanup complete.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
