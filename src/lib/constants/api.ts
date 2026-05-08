// API and external service constants for consistent usage across the application

// Service Types Constants
// These are generic service types that can be used in your service definitions
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
  TEAMSPACE: 'teamspace',
  GITLAB: 'gitlab',
  SLACK: 'slack',
} as const;

// Default Values (generic placeholders - configure in YAML files)
export const DEFAULT_VALUES = {
  TEAMSPACE_BASE_URL: 'https://example.com/teamspace',
  GITLAB_PROJECT_ID: 'your-project-id',
  LOCALHOST_PREFIX: 'http://localhost:',
} as const;

// TypeScript types derived from constants
export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];
export type ConfigFile = typeof CONFIG_FILES[keyof typeof CONFIG_FILES];
export type ExternalService = typeof EXTERNAL_SERVICES[keyof typeof EXTERNAL_SERVICES];

// Helper function to build localhost URL
export const buildLocalhostUrl = (port: number): string => {
  return `${DEFAULT_VALUES.LOCALHOST_PREFIX}${port}`;
};