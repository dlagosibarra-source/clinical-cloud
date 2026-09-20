/**
 * Database Setup Script
 *
 * Creates the clinical_cloud_dev database if it doesn't exist.
 * Connects to the administrative 'postgres' database first.
 *
 * Usage: DATABASE_URL=postgresql://localhost:5432/clinical_cloud_dev npm run db:setup
 */

import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    console.error('Example: DATABASE_URL=postgresql://localhost:5432/clinical_cloud_dev');
    process.exit(1);
  }

  // Parse the target database name from DATABASE_URL
  const url = new URL(databaseUrl);
  const targetDb = url.pathname.slice(1); // Remove leading '/'

  if (!targetDb) {
    console.error('ERROR: DATABASE_URL must include a database name.');
    process.exit(1);
  }

  // Validate the database name before interpolating it into CREATE DATABASE.
  // Restrict to simple identifiers to prevent arbitrary names or SQL injection.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(targetDb)) {
    console.error(
      `ERROR: Invalid database name '${targetDb}'. ` +
      'It must match the pattern ^[a-zA-Z_][a-zA-Z0-9_]*$.',
    );
    process.exit(1);
  }

  // Connect to the administrative 'postgres' database
  url.pathname = '/postgres';
  const adminSql = postgres(url.toString(), { max: 1 });

  try {
    // Check if target database exists
    const result = await adminSql`
      SELECT 1 FROM pg_database WHERE datname = ${targetDb}
    `;

    if (result.length > 0) {
      console.log(`Database '${targetDb}' already exists.`);
    } else {
      // Create the database (cannot use parameterized query for CREATE DATABASE)
      await adminSql.unsafe(`CREATE DATABASE "${targetDb}"`);
      console.log(`Database '${targetDb}' created successfully.`);
    }
  } catch (error) {
    console.error('Failed to create database:', error);
    process.exit(1);
  } finally {
    await adminSql.end();
  }
}

main();
