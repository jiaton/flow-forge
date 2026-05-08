/**
 * Service Execution - Main entry point
 *
 * Re-exports all process execution functionality:
 * - process-spawner.js: Core process spawning and management
 * - detached-recovery.js: Recovery of detached processes after app restart
 *
 * Note: Optimized for macOS/Unix systems.
 */

// Re-export core spawning functionality
export { startServiceProcess } from './process-spawner.js';

// Re-export detached service recovery
export { recoverDetachedServices } from './detached-recovery.js';

// Re-export log tailing utilities
export { stopLogFileTailing } from '../logs/detached-tailer.js';
