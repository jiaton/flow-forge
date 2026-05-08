/**
 * Module System
 *
 * Core module infrastructure for pluggable features.
 */

export * from './types';
export * from './ModuleRegistry';
export * from './ModuleConfigLoader';

// Re-export utility functions
export { isValidModuleId, getFirstEnabledModule } from './ModuleRegistry';
