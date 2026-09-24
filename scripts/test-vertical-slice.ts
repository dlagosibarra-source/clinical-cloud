import { db, schema } from "../src/shared/database";
import { getAuthenticatedContext } from "../src/shared/auth/context";
import { OrganizationService } from "../src/modules/organizations/services/organization.service";
import { ServiceService } from "../src/modules/services/services/service.service";
import { PatientService } from "../src/modules/patients/services/patient.service";
import { AppointmentService } from "../src/modules/appointments/services/appointment.service";
import { AvailabilityService } from "../src/modules/availability/services/availability.service";
import { eq } from "drizzle-orm";
import type { AuthContext } from "../src/shared/types/index";

const TEST_ORG_SLUG = "test-clinical-cloud-org";
const TEST_ORG_NAME = "Test Clinical Cloud Organization";

async function main() {
    let authContext: AuthContext;
    let organizationService: OrganizationService;
    let serviceService: ServiceService;
    let patientService: PatientService;
    let appointmentService: AppointmentService;

    console.log("🚀 Starting Vertical Slice Integration Test...");
    console.log("-----------------------------------------------------");

    try {
        authContext = getAuthenticatedContext();
        organizationService = new OrganizationService(db);
        serviceService = new ServiceService(db);
        patientService = new PatientService(db);
        appointmentService = new AppointmentService(db);

        console.log("✅ Services initialized.");
        console.log(`Using mock AuthContext: Organization ID = ${authContext.organization_id}, User ID = ${authContext.user_id}`);

        // 1. Cleanup existing data for the test organization
        console.log("🧹 Cleaning up existing test data...");

        const existingOrg = await db.query.organizations.findFirst({
            where: eq(schema.organizations.slug, TEST_ORG_SLUG),
        });

        if (existingOrg) {
            const orgId = existingOrg.organizationId;
            console.log(`Found existing organization (ID: ${orgId}), cleaning up its data...`);

            // Delete dependencies in transaction to handle FK constraints correctly
            await db.transaction(async (tx) => {
                await tx.delete(schema.appointments).where(eq(schema.appointments.organizationId, orgId));
                await tx.delete(schema.dentistAvailability).where(eq(schema.dentistAvailability.organizationId, orgId));
                await tx.delete(schema.availabilityBlocks).where(eq(schema.availabilityBlocks.organizationId, orgId));
                await tx.delete(schema.services).where(eq(schema.services.organizationId, orgId));
                await tx.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
                await tx.delete(schema.dentists).where(eq(schema.dentists.organizationId, orgId));
                await tx.delete(schema.locations).where(eq(schema.locations.organizationId, orgId));
                await tx.delete(schema.users).where(eq(schema.users.organizationId, orgId));

                // Delete the organization itself
                await tx.delete(schema.organizations).where(eq(schema.organizations.organizationId, orgId));
            });
            console.log("✅ Cleanup complete.");
        } else {
            console.log("No existing test organization found, skipping cleanup.");
        }


        // 2. Insert or retrieve a test organization
        console.log("🏢 Creating/Retrieving Test Organization...");
        let createdOrganization;
        try {
            const result = await organizationService.createOrganization({
                name: TEST_ORG_NAME,
                slug: TEST_ORG_SLUG,
            });
            createdOrganization = result[0];
        } catch (e) {
            console.error("DEBUG: Failed to execute organizationService.createOrganization:", e);
            throw e;
        }

        if (!createdOrganization) {
            throw new Error(`Failed to create organization with slug ${TEST_ORG_SLUG}. Result was empty.`);
        }
        authContext.organization_id = createdOrganization.organizationId;
        console.log(`✅ Organization created: ID = ${createdOrganization.organizationId}, Name = ${createdOrganization.name}`);

        // Create a unique mock user for the createdByUserId field
        const uniqueUserId = crypto.randomUUID();
        authContext.user_id = uniqueUserId;

        console.log("👤 Creating Mock User...");
        const mockUser = await db.insert(schema.users)
            .values({
                userId: authContext.user_id,
                organizationId: authContext.organization_id,
                email: `testuser-${uniqueUserId}@example.com`,
                firstName: "Test",
                lastName: "User",
                role: "ADMIN",
                status: "ACTIVE",
            })
            .onConflictDoUpdate({
                target: [schema.users.organizationId, schema.users.email],
                set: { status: "ACTIVE" }
            })
            .returning();

        if (!mockUser[0]) {
            throw new Error("Failed to create or retrieve mock user.");
        }
        console.log(`✅ Mock User ready: ID = ${mockUser[0].userId}, Email = ${mockUser[0].email}`);


        // 3. Create a dental service
        console.log("🦷 Creating Dental Service...");
        const newService = await serviceService.createService(authContext, {
            name: "Limpieza Profunda",
            description: "Limpieza dental completa con pulido y fluoración.",
            durationMinutes: 30,
            price: "500.00",
        });
        if (!newService[0]) {
            throw new Error("Failed to create service.");
        }
        console.log(`✅ Service created: ID = ${newService[0].serviceId}, Name = ${newService[0].name}, Duration = ${newService[0].durationMinutes} min, Price = ${newService[0].price}`);

        // 4. Create a patient
        console.log("🧍‍♀️ Creating Test Patient...");
        let newPatient;
        try {
            newPatient = await patientService.createPatient(authContext, {
                firstName: "Ana",
                lastName: "García",
                phone: "+15551234567",
                email: "ana.garcia@example.com",
            });
        } catch (error) {
            console.error("❌ Failed to create patient. Error completo:", error);
            throw error;
        }

        const patientData = Array.isArray(newPatient) ? newPatient[0] : newPatient;
        if (!patientData || !patientData.patientId) {
            throw new Error("Failed to create patient: patient object or patientId is missing.");
        }
        console.log(`✅ Patient created: ID = ${patientData.patientId}, Name = ${patientData.firstName} ${patientData.lastName}`);

        // 4.1 Search Patient
        console.log("🔍 Testing Search Patient...");
        const searchResults = await patientService.searchPatients(authContext, "García", 1, 10);
        if (searchResults.length === 0 || searchResults[0]?.patientId !== patientData.patientId) {
            throw new Error("Patient search failed to return the expected patient.");
        }
        console.log("✅ Patient search successful.");

        // 4.2 Update Patient
        console.log("✏️ Testing Update Patient...");
        const updatedPatient = await patientService.updatePatient(authContext, patientData.patientId, { phone: "+15559876543" });
        if (!updatedPatient || updatedPatient.phone !== "+15559876543") {
            throw new Error("Patient update failed.");
        }
        console.log(`✅ Patient updated: ID = ${updatedPatient.patientId}, New Phone = ${updatedPatient.phone}`);


        // 5. Create Location and Dentist (required for appointments cross-org FKs)
        console.log("📍 Creating Test Location...");
        const [testLocation] = await db.insert(schema.locations)
            .values({
                organizationId: authContext.organization_id,
                name: "Sucursal Test",
                code: "TEST-LOC-01",
            })
            .returning();

        if (!testLocation) {
            throw new Error("Failed to create test location.");
        }
        console.log(`✅ Location created: ID = ${testLocation.locationId}, Name = ${testLocation.name}`);

        console.log("👨‍⚕️ Creating Test Dentist...");
        const [testDentist] = await db.insert(schema.dentists)
            .values({
                organizationId: authContext.organization_id,
                userId: authContext.user_id,
                firstName: "Carlos",
                lastName: "Dentista",
                licenseNumber: "CED-TEST-001",
            })
            .returning();

        if (!testDentist) {
            throw new Error("Failed to create test dentist.");
        }
        console.log(`✅ Dentist created: ID = ${testDentist.dentistId}, Name = ${testDentist.firstName} ${testDentist.lastName}`);

        // Define appointmentStartTime early for consistency
        const appointmentStartTime = new Date();
        appointmentStartTime.setDate(appointmentStartTime.getDate() + 1);
        appointmentStartTime.setHours(10, 0, 0, 0); // 10:00 AM tomorrow for consistency

        // Insert availability for the dentist
        console.log("🕒 Inserting Dentist Availability...");
        const dayOfWeek = appointmentStartTime.getDay();
        await db.insert(schema.dentistAvailability).values({
            organizationId: authContext.organization_id,
            dentistId: testDentist.dentistId,
            dayOfWeek: dayOfWeek,
            startTime: "08:00:00",
            endTime: "18:00:00",
        });
        console.log(`✅ Dentist availability inserted for day ${dayOfWeek} (0=Sun, 1=Mon, ...)`);

        // 6. Create an appointment
        console.log("🗓️ Creating Appointment...");

        const newAppointment = await appointmentService.createAppointment(authContext, {
            patientId: patientData.patientId,
            dentistId: testDentist.dentistId,
            locationId: testLocation.locationId,
            serviceId: newService[0].serviceId,
            startAt: appointmentStartTime,
            // endAt is intentionally omitted to test automatic calculation
        });

        const createdAppointment = Array.isArray(newAppointment) ? newAppointment[0] : newAppointment;
        if (!createdAppointment) {
            throw new Error("Failed to create appointment.");
        }

        console.log(`✅ Appointment created: ID = ${createdAppointment.appointmentId}`);
        console.log(`   Start At: ${createdAppointment.startAt.toISOString()}`);
        console.log(`   End At (calculated): ${createdAppointment.endAt.toISOString()}`);
        console.log(`   Service Name Snapshot: ${createdAppointment.serviceNameSnapshot}`);
        console.log(`   Service Duration Snapshot: ${createdAppointment.serviceDurationSnapshot} min`);
        console.log(`   Service Value Snapshot: ${createdAppointment.serviceValueSnapshot}`);
        console.log(`   Created By User ID: ${createdAppointment.createdByUserId}`);

        // Verify snapshots and end_at calculation
        if (createdAppointment.serviceNameSnapshot !== newService[0].name) {
            throw new Error("Service name snapshot mismatch.");
        }
        
        // 6.1 Test Patient History
        console.log("📜 Testing Patient History...");
        const history = await patientService.getPatientHistory(authContext, patientData.patientId);
        if (history.length === 0 || history[0]?.appointmentId !== createdAppointment.appointmentId) {
            throw new Error("Patient history failed to return the appointment.");
        }
        console.log("✅ Patient history retrieved successfully.");

        if (createdAppointment.serviceDurationSnapshot !== newService[0].durationMinutes) {
            throw new Error("Service duration snapshot mismatch.");
        }
        if (createdAppointment.serviceValueSnapshot !== newService[0].price) {
            throw new Error("Service price snapshot mismatch.");
        }

        const expectedEndTime = new Date(appointmentStartTime.getTime() + newService[0].durationMinutes * 60000);
        if (createdAppointment.endAt.getTime() !== expectedEndTime.getTime()) {
            throw new Error("Calculated end_at mismatch.");
        }
        console.log("✅ Appointment snapshots and end_at calculation verified.");

        // 7. Test Availability Service
        console.log("🔍 Testing Availability Service...");
        const availabilityService = new AvailabilityService(db);
        const testDate = appointmentStartTime; // Same date as the appointment

        const availabilityResult = await availabilityService.getAvailableSlots(
            authContext,
            testDentist.dentistId,
            testDate,
            newService[0].serviceId
        );

        console.log("✅ Availability check completed:");
        console.log(`   Date: ${availabilityResult.date}`);
        console.log(`   Has availability windows: ${availabilityResult.availableWindows.length > 0}`);
        console.log(`   Available windows: ${JSON.stringify(availabilityResult.availableWindows)}`);
        console.log(`   Occupied intervals: ${JSON.stringify(availabilityResult.occupiedIntervals)}`);

        console.log("-----------------------------------------------------");
        console.log("🎉 Vertical Slice Integration Test Completed Successfully!");
    } catch (error: unknown) {
        console.error("-----------------------------------------------------");
        console.error("❌ Vertical Slice Integration Test Failed!");
        console.error("Error completo:", error);
        process.exit(1);
    } finally {
        // Optional: Add a final cleanup here if the test should leave no trace always,
        // even on success. For now, we rely on the initial cleanup for idempotency.
    }
}

main();
