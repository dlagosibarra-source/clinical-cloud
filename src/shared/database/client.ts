/**
 * Centralized database client for Clinical Cloud.
 *
 * All database access MUST go through this module.
 * Do NOT create direct PostgreSQL connections in domain modules.
 *
 * The client uses the `postgres` driver (porsager/postgres) with Drizzle ORM.
 * It reads DATABASE_URL from the environment.
 *
 * For local development: postgresql://localhost:5432/clinical_cloud_dev
 * For production (future): Amazon RDS PostgreSQL connection string
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
      'For local development, set it in .env.local:\n' +
      'DATABASE_URL=postgresql://localhost:5432/clinical_cloud_dev',
    );
  }
  return url;
}

/**
 * Raw postgres client.
 * Use `db` (Drizzle instance) for all queries.
 * Only use `queryClient` directly for advanced scenarios (e.g., raw SQL in scripts).
 */
export const queryClient = postgres(getDatabaseUrl());

/**
 * Drizzle ORM database instance.
 * This is the primary interface for all database operations.
 *
 * Usage:
 *   import { db } from '@/shared/database';
 *   const rows = await db.select().from(organizations);
 */
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
