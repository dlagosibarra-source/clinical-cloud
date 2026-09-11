/**
 * Database Schema Barrel
 *
 * Re-exports all table schemas from domain modules.
 * This file is the single entry point for Drizzle Kit and the database client.
 *
 * Import order follows the dependency graph:
 * organizations → users, patients, dentists, locations → resources → services → appointments
 */

export { organizations } from '../../modules/organizations/types/schema';
export { users } from '../../modules/users/types/schema';
export { patients } from '../../modules/patients/types/schema';
export { dentists } from '../../modules/dentists/types/schema';
export { locations } from '../../modules/locations/types/schema';
export { resources } from '../../modules/resources/types/schema';
export { services } from '../../modules/services/types/schema';
export { appointments } from '../../modules/appointments/types/schema';
