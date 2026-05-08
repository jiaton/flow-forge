/**
 * UI and Navigation Constants
 *
 * Constants for UI states, navigation, notifications, and environment display.
 *
 * @module ui.constants
 */

// Application Views/Pages Constants
export const VIEWS = {
  DASHBOARD: 'dashboard',
  JSON_EDITOR: 'json-editor',
  VISUAL_JSON_EDITOR: 'visual-json-editor',
  SERVICE_ORCHESTRATOR: 'service-orchestrator',
  FLOW_VISUALIZER: 'flow-visualizer',
  GIT_MANAGER: 'git-manager',  // Renamed from MR_MANAGER
  CONFIG_SETTINGS: 'config-settings',
} as const;

// Environment names (used in config files and APIs)
export const ENVIRONMENT_NAMES = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  LOCAL: 'local',
} as const;

// Short environment names (used in UI and URLs)
export const ENVIRONMENT_SHORT_NAMES = {
  PRODUCTION: 'prod',
  STAGING: 'stage',
  DEVELOPMENT: 'dev',
  TESTING: 'test',
  LOCAL: 'local',
} as const;

// All possible environment values for UI
export const UI_ENVIRONMENTS = [
  ENVIRONMENT_SHORT_NAMES.LOCAL,
  ENVIRONMENT_SHORT_NAMES.DEVELOPMENT,
  ENVIRONMENT_SHORT_NAMES.TESTING,
  ENVIRONMENT_SHORT_NAMES.STAGING,
  ENVIRONMENT_SHORT_NAMES.PRODUCTION,
] as const;

// Notification Types Constants
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// UI State Constants
export const UI_STATES = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  EMPTY: 'empty',
} as const;

// Pipeline/Workflow Status Constants
export const PIPELINE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

// Merge Request / Pull Request Status Constants
export const MR_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const;

// TypeScript types
export type ViewType = typeof VIEWS[keyof typeof VIEWS];
export type FullEnvironment = typeof ENVIRONMENT_NAMES[keyof typeof ENVIRONMENT_NAMES];
export type ShortEnvironment = typeof ENVIRONMENT_SHORT_NAMES[keyof typeof ENVIRONMENT_SHORT_NAMES];
export type UIEnvironment = typeof UI_ENVIRONMENTS[number];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type UIState = typeof UI_STATES[keyof typeof UI_STATES];
export type PipelineStatus = typeof PIPELINE_STATUS[keyof typeof PIPELINE_STATUS];
export type MRStatus = typeof MR_STATUS[keyof typeof MR_STATUS];

// Navigation Menu Item Interface
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  view?: ViewType;
}

// Default Menu Items (can be overridden by team configs)
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: VIEWS.DASHBOARD, label: 'Dashboard', icon: 'Dashboard', view: VIEWS.DASHBOARD },
  { id: VIEWS.SERVICE_ORCHESTRATOR, label: 'Service Orchestrator', icon: 'CloudQueue', view: VIEWS.SERVICE_ORCHESTRATOR },
  { id: VIEWS.JSON_EDITOR, label: 'JSON Editor', icon: 'Code', view: VIEWS.JSON_EDITOR },
  { id: VIEWS.FLOW_VISUALIZER, label: 'Flow Visualizer', icon: 'Timeline', view: VIEWS.FLOW_VISUALIZER },
  { id: VIEWS.GIT_MANAGER, label: 'Git Manager', icon: 'MergeType', view: VIEWS.GIT_MANAGER },
];

// Helper Functions

/**
 * Get environment short name from full name
 */
export const getEnvironmentShortName = (environment: string): string => {
  switch (environment) {
    case ENVIRONMENT_NAMES.PRODUCTION:
      return ENVIRONMENT_SHORT_NAMES.PRODUCTION;
    case ENVIRONMENT_NAMES.STAGING:
      return ENVIRONMENT_SHORT_NAMES.STAGING;
    case ENVIRONMENT_NAMES.DEVELOPMENT:
      return ENVIRONMENT_SHORT_NAMES.DEVELOPMENT;
    case ENVIRONMENT_NAMES.TESTING:
      return ENVIRONMENT_SHORT_NAMES.TESTING;
    default:
      return ENVIRONMENT_SHORT_NAMES.LOCAL;
  }
};

/**
 * Get MUI color for environment badge
 */
export const getEnvironmentColor = (env: string): 'error' | 'warning' | 'success' => {
  switch (env) {
    case ENVIRONMENT_SHORT_NAMES.PRODUCTION:
      return 'error';
    case ENVIRONMENT_SHORT_NAMES.STAGING:
    case ENVIRONMENT_SHORT_NAMES.TESTING:
      return 'warning';
    default:
      return 'success';
  }
};

/**
 * Get border color for environment
 */
export const getEnvironmentBorderColor = (env: string): string => {
  switch (env) {
    case ENVIRONMENT_SHORT_NAMES.PRODUCTION:
      return '#f44336';
    case ENVIRONMENT_SHORT_NAMES.STAGING:
    case ENVIRONMENT_SHORT_NAMES.TESTING:
      return '#ff9800';
    default:
      return '#4caf50';
  }
};

/**
 * Get background color for environment
 */
export const getEnvironmentBackgroundColor = (env: string): string => {
  switch (env) {
    case ENVIRONMENT_SHORT_NAMES.PRODUCTION:
      return '#ffebee';
    case ENVIRONMENT_SHORT_NAMES.STAGING:
    case ENVIRONMENT_SHORT_NAMES.TESTING:
      return '#fff3e0';
    default:
      return '#e8f5e8';
  }
};

/**
 * Get notification icon name
 */
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'CheckCircle';
    case NOTIFICATION_TYPES.ERROR:
      return 'Error';
    case NOTIFICATION_TYPES.WARNING:
      return 'Warning';
    case NOTIFICATION_TYPES.INFO:
      return 'Info';
    default:
      return 'Info';
  }
};

/**
 * Validate environment
 */
export const isValidEnvironment = (env: string): env is FullEnvironment => {
  return Object.values(ENVIRONMENT_NAMES).includes(env as FullEnvironment);
};

/**
 * Validate UI environment
 */
export const isValidUIEnvironment = (env: string): env is UIEnvironment => {
  return UI_ENVIRONMENTS.includes(env as UIEnvironment);
};
