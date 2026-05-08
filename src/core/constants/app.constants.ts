/**
 * Application Metadata Constants
 *
 * Core application configuration and metadata constants used throughout FlowForge.
 *
 * @module app.constants
 */

// Service Types Constants
export const SERVICE_TYPES = {
  MONOLITH_BACKEND: 'Monolith Backend',
  GRAPHQL_GATEWAY: 'GraphQL Gateway',
  MICROSERVICE: 'Microservice',
  API_GATEWAY: 'API Gateway',
  FRONTEND_APPLICATION: 'Frontend Application',
  DATABASE: 'Database',
  CACHE: 'Cache Service',
} as const;

// Configuration File Names
// Note: Paths are resolved by Electron backend using resolveConfigPath()
// Frontend should only use filenames when calling electronAPI.readConfigFile()
export const CONFIG_FILES = {
  APP_CONFIG: 'app.config.yaml',
  TEAM_PRESETS: 'team-presets.yaml',
  GLOBAL_SETTINGS: 'global-settings.yaml',
  // SERVICE_COMMANDS removed - now using modular services/ directory
} as const;

// Configuration Directories
export const CONFIG_DIRS = {
  SERVICES: 'services',
  EXAMPLES: 'examples',
  DOCS: 'docs',
} as const;

// External Service Categories
export const EXTERNAL_SERVICES = {
  GIT_HOSTING: 'git-hosting',  // Generic git hosting (GitLab, GitHub, Bitbucket)
  TEAMSPACE: 'teamspace',
  SLACK: 'slack',
} as const;

// Service Status & Execution Mode Constants
// Re-export from shared constants (single source of truth)
export { SERVICE_STATUS, EXECUTION_MODE, type ServiceStatus, type ExecutionMode } from '../../shared/constants/service';

// TypeScript types derived from constants
export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];
export type ConfigFile = typeof CONFIG_FILES[keyof typeof CONFIG_FILES];
export type ExternalService = typeof EXTERNAL_SERVICES[keyof typeof EXTERNAL_SERVICES];

// Team type is a string since teams are dynamically loaded from config/team-presets.yaml
export type Team = string;

// Team Validation Helper
export const isValidTeam = (team: string): team is Team => {
  return typeof team === 'string' && team.length > 0;
};
