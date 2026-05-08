/**
 * Shared Service Constants
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for all service-related constants.
 * Both frontend (React) and backend (Electron) import from this file.
 *
 * DO NOT create duplicate constant definitions elsewhere.
 * DO NOT use hardcoded strings - always import from here.
 */

// ============================================================================
// SERVICE MODE CONSTANTS
// ============================================================================

/**
 * Service execution mode - determines lifecycle management strategy
 */
export const SERVICE_MODE = {
  /** Default — shell process managed by FlowForge */
  PROCESS: 'process',
  /** Docker — container lifecycle via docker-compose */
  DOCKER: 'docker',
} as const;

export type ServiceMode = typeof SERVICE_MODE[keyof typeof SERVICE_MODE];

// ============================================================================
// SERVICE STATUS CONSTANTS
// ============================================================================

/**
 * Service status enumeration
 * Used by both service orchestration and UI components
 */
export const SERVICE_STATUS = {
  /** Service is not running */
  IDLE: 'idle',

  /** Service is in the process of starting (process exists but not ready) */
  STARTING: 'starting',

  /** Service is fully running and operational */
  RUNNING: 'running',

  /** Service is in the process of stopping */
  STOPPING: 'stopping',

  /** Service is restarting (stop + start sequence) */
  RESTARTING: 'restarting',

  /** Service encountered an error */
  ERROR: 'error',

  /** Service was stopped (explicitly stopped, different from idle) */
  STOPPED: 'stopped',

  /** Service failed to start or crashed */
  FAILED: 'failed',

  /** Service status cannot be determined */
  UNKNOWN: 'unknown'
} as const;

/**
 * Legacy alias for backend compatibility
 * @deprecated Use SERVICE_STATUS instead
 */
export const SERVICE_STATES = SERVICE_STATUS;

/** TypeScript type derived from SERVICE_STATUS constant */
export type ServiceStatus = typeof SERVICE_STATUS[keyof typeof SERVICE_STATUS];

/** Legacy type alias for backward compatibility */
export type ServiceState = ServiceStatus;

// ============================================================================
// PROCESS TRACKING CONSTANTS
// ============================================================================

/**
 * Process tracking types for service orchestration
 */
export const PROCESS_TYPE = {
  /** Child process managed by FlowForge */
  INTERNAL: 'internal',

  /** Process started outside FlowForge (detached mode) */
  EXTERNAL: 'external'
} as const;

export type ProcessType = typeof PROCESS_TYPE[keyof typeof PROCESS_TYPE];

/**
 * Detection methods for service status checks
 */
export const DETECTION_METHOD = {
  /** Fast PID file check (~1-5ms) */
  PID_FILE: 'pid-file',

  /** Port-based detection via lsof (~10-20ms) */
  PORT_BASED: 'port-based',

  /** Command execution check (~100-200ms) */
  COMMAND_CHECK: 'command-check',

  /** Direct process reference (attached mode) */
  PROCESS_REF: 'process-ref'
} as const;

export type DetectionMethod = typeof DETECTION_METHOD[keyof typeof DETECTION_METHOD];

// ============================================================================
// SERVICE EXECUTION MODE CONSTANTS
// ============================================================================

/**
 * Service execution mode
 */
export const EXECUTION_MODE = {
  INTERNAL: 'internal',
} as const;

export type ExecutionMode = typeof EXECUTION_MODE[keyof typeof EXECUTION_MODE];

// ============================================================================
// PIPELINE STATUS CONSTANTS
// ============================================================================

/**
 * CI/CD Pipeline status constants
 */
export const PIPELINE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export type PipelineStatus = typeof PIPELINE_STATUS[keyof typeof PIPELINE_STATUS];

// ============================================================================
// MERGE REQUEST STATUS CONSTANTS
// ============================================================================

/**
 * Git merge request status constants
 */
export const MR_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const;

export type MRStatus = typeof MR_STATUS[keyof typeof MR_STATUS];

// ============================================================================
// ENVIRONMENT STATUS CONSTANTS
// ============================================================================

/**
 * Environment/Teamspace status constants
 */
export const ENVIRONMENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DEPLOYING: 'deploying',
} as const;

export type EnvironmentStatus = typeof ENVIRONMENT_STATUS[keyof typeof ENVIRONMENT_STATUS];

// ============================================================================
// CONTEXT MENU CONSTANTS
// ============================================================================

/**
 * Submenu types for service context menu
 */
export const SUBMENU_TYPE = {
  IDE: 'ide',
  QUICK_COMMANDS: 'quick',
  ROUTINES: 'routine',
} as const;

export type SubmenuType = typeof SUBMENU_TYPE[keyof typeof SUBMENU_TYPE];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get MUI color for service status display
 */
export const getServiceStatusColor = (status: ServiceStatus): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case SERVICE_STATUS.RUNNING:
      return 'success';
    case SERVICE_STATUS.ERROR:
    case SERVICE_STATUS.FAILED:
      return 'error';
    case SERVICE_STATUS.IDLE:
    case SERVICE_STATUS.STOPPED:
      return 'default';
    default:
      return 'warning';
  }
};

/**
 * Get MUI color for pipeline status display
 */
export const getPipelineStatusColor = (status: PipelineStatus): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case PIPELINE_STATUS.PASSED:
      return 'success';
    case PIPELINE_STATUS.FAILED:
      return 'error';
    case PIPELINE_STATUS.RUNNING:
      return 'warning';
    case PIPELINE_STATUS.PENDING:
    case PIPELINE_STATUS.CANCELED:
      return 'default';
    default:
      return 'default';
  }
};

/**
 * Get MUI color for environment status display
 */
export const getEnvironmentStatusColor = (status: EnvironmentStatus): 'success' | 'warning' | 'default' => {
  switch (status) {
    case ENVIRONMENT_STATUS.ACTIVE:
      return 'success';
    case ENVIRONMENT_STATUS.DEPLOYING:
      return 'warning';
    case ENVIRONMENT_STATUS.INACTIVE:
      return 'default';
    default:
      return 'default';
  }
};

// ============================================================================
// SERVICE OPERATION MESSAGES
// ============================================================================

/**
 * Standard service operation messages
 */
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

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a string is a valid service status
 */
export const isValidServiceStatus = (value: unknown): value is ServiceStatus => {
  return typeof value === 'string' && Object.values(SERVICE_STATUS).includes(value as ServiceStatus);
};

/**
 * Check if a string is a valid detection method
 */
export const isValidDetectionMethod = (value: unknown): value is DetectionMethod => {
  return typeof value === 'string' && Object.values(DETECTION_METHOD).includes(value as DetectionMethod);
};
