/**
 * Drizzle ORM Schema Definitions
 * Central export for all database schemas
 */

// App schemas
export {
  appSettings,
  teamConfigs,
  viewStates,
  notifications,
} from './app.js';

// Service orchestration schemas
export {
  serviceState,
  detachedServices,
} from './service-orchestration.js';

// Git provider schemas
export {
  gitSettings,
  mergeRequests,
} from './git.js';

// Meta schemas
export {
  schemaInfo,
  SCHEMA_VERSION,
} from './meta.js';

// Routine schemas
export {
  routineSchedules,
} from './routines.js';

// Re-export all for convenience
export * from './app.js';
export * from './service-orchestration.js';
export * from './git.js';
export * from './meta.js';
