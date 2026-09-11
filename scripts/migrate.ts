/**
 * Database Migration Script
 *
 * Runs Drizzle ORM migrations and then applies custom SQL
 * for features not supported natively by Drizzle (e.g., exclusion constraints).
 *
 * Usage: DATABASE_URL=postgresql://localhost:5432/clinical_cloud_dev npm run db:migrate
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '.env.local' });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);

  try {
    // Step 1: Run Drizzle migrations
    console.log('Running Drizzle migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Drizzle migrations applied successfully.');

    // Step 2: Apply custom SQL (exclusion constraint for double-booking protection)
    console.log('Applying custom constraints...');

    // Enable btree_gist extension (required for exclusion constraint on uuid + tstzrange)
    await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`;

    // Exclusion constraint: prevent overlapping appointments per dentist
    // Only applies to active statuses (not CANCELLED or RESCHEDULED)
    // Uses half-open range [start_at, end_at) to allow back-to-back appointments
    //
    // NOTE: Resource-level conflict protection (resource_id overlap) should be
    // added in a future phase when resource scheduling is fully implemented.
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'no_dentist_double_booking'
        ) THEN
          ALTER TABLE appointments ADD CONSTRAINT no_dentist_double_booking
            EXCLUDE USING gist (
              dentist_id WITH =,
              tstzrange(start_at, end_at, '[)') WITH &&
            )
            WHERE (status NOT IN ('CANCELLED', 'RESCHEDULED'));
        END IF;
      END $$
    `;
    console.log('Custom constraints applied successfully.');

    console.log('All migrations complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
