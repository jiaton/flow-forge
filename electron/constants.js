/**
 * Electron backend constants
 * Centralized configuration file names and paths
 *
 * Note: These mirror the frontend constants but are kept separate
 * because the Electron main process runs in Node.js context
 */

/**
 * Configuration file names
 */
export const CONFIG_FILES = {
  APP_CONFIG: 'app.config.yaml',
  TEAM_PRESETS: 'team-presets.yaml',
  GLOBAL_SETTINGS: 'global-settings.yaml',
  // SERVICE_COMMANDS removed - now using modular services/ directory
};

/**
 * Configuration directories
 */
export const CONFIG_DIRS = {
  SERVICES: 'services',
  TEMPLATES: 'config.templates',
  DOCS: 'docs',
};

/**
 * Application directory structure (relative to home or project root)
 */
export const APP_DIRS = {
  HOME_DIR: '.flowforge',
  CONFIG: 'config',
  CONFIG_EXAMPLES: 'config.examples',
  DATA: 'data',
  LOGS: 'logs',
};

/**
 * File names
 */
export const APP_FILES = {
  DATABASE: 'flowforge.db',
  LOG: 'main.log',
  REMOTE_SOURCE: 'remote-source.json',
};

/**
 * Remote config sync
 */
export const REMOTE_CONFIG = {
  DEFAULT_BRANCH: 'main',
  CHECK_INTERVAL_HOURS: 24,
};

/**
 * IPC channels for remote config
 */
export const IPC_REMOTE_CONFIG = {
  STATUS: 'remote-config:status',
  CLONE: 'remote-config:clone',
  REFRESH: 'remote-config:refresh',
  REMOVE: 'remote-config:remove',
  APPLY_TEMPLATES: 'remote-config:apply-templates',
};
