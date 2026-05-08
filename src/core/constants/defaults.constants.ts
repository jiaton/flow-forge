/**
 * Default Values Constants
 *
 * Generic placeholder values that should be overridden in YAML configuration files.
 *
 * @module defaults.constants
 */

// Default URLs (configure in app.config.yaml)
export const DEFAULT_VALUES = {
  LOCALHOST_PREFIX: 'http://localhost:',
  GIT_BASE_URL: 'https://gitlab.example.com',
  GIT_API_URL: 'https://gitlab.example.com/api/v4',
  GIT_PROJECT_ID: 'your-project-id',
} as const;

// Service Messages
export const SERVICE_MESSAGES = {
  LOADING_TEAM_CONFIG: 'Loading team config for',
  NO_SERVICES_FOUND: 'No services found for team',
  USING_FALLBACK: 'using fallback',
  FAILED_LOAD_COMMANDS: 'Failed to load service commands',
  RELOADING_COMMANDS: 'Reloading service commands from YAML file',
  COMMANDS_RELOADED: 'Service commands reloaded successfully',
  RELOAD_HANDLER_UNAVAILABLE: 'Dedicated reload handler not available, using fallback approach',
  FAILED_RELOAD_COMMANDS: 'Failed to reload service commands',
  LOADING_PRESET_SERVICES: 'Loading preset services for',
  FOUND_PRESET_SERVICES: 'Found preset services for',
  AUTO_REFRESH_FAILED: 'Auto-refresh logs failed',
  SERVICE_STATUS_CHANGED: 'Service status changed',
  UPDATING_SERVICE_STATUSES: 'Updating service statuses based on actual checks',
  FAILED_CHECK_STATUSES: 'Failed to check service statuses',
  ERROR_CHECKING_STATUSES: 'Error checking service statuses',
  SERVICE_STARTED_EXTERNALLY: 'Service started externally',
} as const;

export type ServiceMessage = typeof SERVICE_MESSAGES[keyof typeof SERVICE_MESSAGES];

/**
 * Helper function to build localhost URL
 */
export const buildLocalhostUrl = (port: number): string => {
  return `${DEFAULT_VALUES.LOCALHOST_PREFIX}${port}`;
};
