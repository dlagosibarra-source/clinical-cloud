/**
 * Database Layer — Public API
 *
 * This is the entry point for the database infrastructure.
 * All modules should import database utilities from this file.
 */

export { db, queryClient } from './client';
export type { Database } from './client';

// Re-export schema for convenience
export * as schema from './schema';
