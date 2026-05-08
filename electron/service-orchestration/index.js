// Main Service Manager - Re-exports all service functionality
// This file acts as a central hub for all service operations

// Lifecycle Management (Start, Stop)
export {
  handleStartService,
  handleStopService,
  handleForceStopService
} from './lifecycle.js';

// Status & Monitoring (Status checking, running services, debug)
export {
  handleGetRunningServices,
  handleDebugServiceProcess,
  handleCheckServiceStatus,
  clearLogCaches,
  checkAllServiceStatus,
  isServiceActuallyRunning,
  getServiceStatus,
  startStatusMonitoring,
  stopStatusMonitoring
} from './runtime-monitor.js';

// Logs Management (Log retrieval)
export {
  handleGetServiceLogs
} from './logs/retrieval.js';

// Configuration Management (Commands)
export {
  handleGetServiceCommands,
  handleReloadServiceCommands
} from './commands.js';

// Direct exports from config for backwards compatibility
export {
  serviceCommands,
  servicePorts,
  loadServiceCommands,
  loadServicePorts
} from './config/microservice-config.js';

// Direct exports from execution modules
export {
  startServiceProcess,
  stopLogFileTailing
} from './execution/index.js';

// Export state management constants and functions for use by other modules
export {
  serviceStateManager,
  SERVICE_STATES,
  PROCESS_TYPES
} from './state-manager.js';

// Export command executor
export {
  executeCommand
} from './execution/command-executor.js';