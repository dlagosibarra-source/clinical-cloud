/**
 * Database Seed Script
 *
 * Inserts DEMO data for local development.
 * All data is clearly identifiable as fictional.
 * Uses fixed UUIDs so the seed is idempotent (safe to run repeatedly).
 *
 * Usage: DATABASE_URL=postgresql://localhost:5432/clinical_cloud_dev npm run db:seed
 *
 * To reset: Drop and recreate the database, then re-run migrations and seed.
 *   npm run db:setup && npm run db:migrate && npm run db:seed
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/shared/database/schema';

config({ path: '.env.local' });

// ─── Fixed DEMO UUIDs (deterministic for idempotency) ───────

const DEMO_ORG_ID = '00000000-0000-4000-a000-000000000001';
const DEMO_USER_ID = '00000000-0000-4000-a000-000000000002';
const DEMO_DENTIST_ID = '00000000-0000-4000-a000-000000000003';
const DEMO_LOCATION_ID = '00000000-0000-4000-a000-000000000004';
const DEMO_RESOURCE_ID = '00000000-0000-4000-a000-000000000005';
const DEMO_SERVICE_ID = '00000000-0000-4000-a000-000000000006';
const DEMO_PATIENT_ID = '00000000-0000-4000-a000-000000000007';
const DEMO_APPOINTMENT_ID = '00000000-0000-4000-a000-000000000008';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    console.log('Seeding DEMO data...');

    // 1. Organization
    await db
      .insert(schema.organizations)
      .values({
        organizationId: DEMO_ORG_ID,
        name: 'Clínica Dental Demo',
        legalName: 'Clínica Dental Demo S.A. de C.V.',
        slug: 'clinica-dental-demo',
        email: 'contacto@demo.clinicalcloud.dev',
        phone: '+525500000000',
        countryCode: 'MX',
        timezone: 'America/Mexico_City',
        currency: 'MXN',
        status: 'ACTIVE',
      })
      .onConflictDoNothing();
    console.log('  ✓ Organization');

    // 2. User (Owner)
    await db
      .insert(schema.users)
      .values({
        userId: DEMO_USER_ID,
        organizationId: DEMO_ORG_ID,
        email: 'owner@demo.clinicalcloud.dev',
        firstName: 'Admin',
        lastName: 'Demo',
        role: 'OWNER',
        status: 'ACTIVE',
        phone: '+525500000001',
      })
      .onConflictDoNothing();
    console.log('  ✓ User (owner)');

    // 3. Dentist
    await db
      .insert(schema.dentists)
      .values({
        dentistId: DEMO_DENTIST_ID,
        organizationId: DEMO_ORG_ID,
        userId: DEMO_USER_ID,
        firstName: 'Carlos',
        lastName: 'García',
        professionalName: 'Dr. Carlos García Demo',
        licenseNumber: 'CED-DEMO-12345',
        specialty: 'Odontología General',
        phone: '+525500000002',
        email: 'dr.garcia@demo.clinicalcloud.dev',
        status: 'ACTIVE',
      })
      .onConflictDoNothing();
    console.log('  ✓ Dentist');

    // 4. Location
    await db
      .insert(schema.locations)
      .values({
        locationId: DEMO_LOCATION_ID,
        organizationId: DEMO_ORG_ID,
        name: 'Sucursal Centro',
        code: 'CENTRO-01',
        description: 'Sucursal principal del centro de la ciudad',
        phone: '+525500000003',
        email: 'centro@demo.clinicalcloud.dev',
        address: 'Av. Reforma 100, Col. Centro',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06000',
        countryCode: 'MX',
        timezone: 'America/Mexico_City',
        status: 'ACTIVE',
      })
      .onConflictDoNothing();
    console.log('  ✓ Location');

    // 5. Resource (Dental Chair)
    await db
      .insert(schema.resources)
      .values({
        resourceId: DEMO_RESOURCE_ID,
        organizationId: DEMO_ORG_ID,
        locationId: DEMO_LOCATION_ID,
        name: 'Sillón Dental 1',
        code: 'CHAIR-01',
        resourceType: 'CHAIR',
        description: 'Sillón dental principal',
        status: 'ACTIVE',
      })
      .onConflictDoNothing();
    console.log('  ✓ Resource');

    // 6. Service
    await db
      .insert(schema.services)
      .values({
        serviceId: DEMO_SERVICE_ID,
        organizationId: DEMO_ORG_ID,
        name: 'Limpieza Dental',
        description: 'Limpieza dental profesional con ultrasonido',
        durationMinutes: 45,
        price: '800.00',
        currency: 'MXN',
        status: 'ACTIVE',
      })
      .onConflictDoNothing();
    console.log('  ✓ Service');

    // 7. Patient
    await db
      .insert(schema.patients)
      .values({
        patientId: DEMO_PATIENT_ID,
        organizationId: DEMO_ORG_ID,
        firstName: 'María',
        lastName: 'López Demo',
        phone: '+525512345678',
        email: 'maria.lopez@demo.clinicalcloud.dev',
        dateOfBirth: '1990-05-15',
        gender: 'F',
        whatsappOptIn: true,
        whatsappOptInAt: new Date(),
        status: 'ACTIVE',
      })
      .onConflictDoNothing();
    console.log('  ✓ Patient');

    // 8. Appointment (tomorrow at 10:00 - 10:45)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const appointmentEnd = new Date(tomorrow);
    appointmentEnd.setMinutes(45);

    await db
      .insert(schema.appointments)
      .values({
        appointmentId: DEMO_APPOINTMENT_ID,
        organizationId: DEMO_ORG_ID,
        patientId: DEMO_PATIENT_ID,
        dentistId: DEMO_DENTIST_ID,
        locationId: DEMO_LOCATION_ID,
        resourceId: DEMO_RESOURCE_ID,
        serviceId: DEMO_SERVICE_ID,
        startAt: tomorrow,
        endAt: appointmentEnd,
        status: 'SCHEDULED',
        notes: 'Cita de demostración - Limpieza dental',
        createdByUserId: DEMO_USER_ID,
        serviceNameSnapshot: 'Limpieza Dental',
        serviceDurationSnapshot: 45,
        serviceValueSnapshot: '800.00',
      })
      .onConflictDoNothing();
    console.log('  ✓ Appointment');

    console.log('\nDEMO seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
