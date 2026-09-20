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
 *
 * In development, Next.js hot reload re-evaluates modules multiple times.
 * The globalThis-scoped cache below guarantees a single `postgres` pool and
 * a single Drizzle instance are reused across reloads instead of creating
 * new connection pools on every module evaluation.
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as typeof globalThis & {
  __clinicalCloudQueryClient?: Sql;
  __clinicalCloudDb?: PostgresJsDatabase<typeof schema>;
};

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
export const queryClient = globalForDb.__clinicalCloudQueryClient ?? postgres(getDatabaseUrl());

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__clinicalCloudQueryClient = queryClient;
}

/**
 * Drizzle ORM database instance.
 * This is the primary interface for all database operations.
 *
 * Usage:
 *   import { db } from '@/shared/database';
 *   const rows = await db.select().from(organizations);
 */
export const db = globalForDb.__clinicalCloudDb ?? drizzle(queryClient, { schema });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__clinicalCloudDb = db;
}

export type Database = typeof db;
